"""Routing core: directed bike graph, perceived costs, shortest paths, all-or-nothing assignment."""
import os, pickle
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra

from lib import WORK, penalty_of, CONTRAFLOW, WALK


class Net:
    def __init__(self, G=None):
        if G is None:
            with open(os.path.join(WORK, "graph.pkl"), "rb") as f:
                G = pickle.load(f)
        self.G = G
        self.N = len(G["node_ll"])
        m = self.m = len(G["u"])
        u, v = G["u"], G["v"]
        # arcs 0..m-1 forward (u->v), m..2m-1 backward (v->u)
        self.au = np.r_[u, v]; self.av = np.r_[v, u]
        self.edge_of_arc = np.r_[np.arange(m), np.arange(m)]
        ow = G["ow"]
        self.contra = np.r_[ow == -1, ow == 1]           # arc goes against a one-way street
        self.length = G["length"]
        w = G["walk"] if "walk" in G else (G["hw"] == "steps")
        self.walk = np.r_[w, w]                            # steps or "bicycle=dismount": walk the bike
        # group parallel arcs by (from, to) so the CSR has one entry per node pair
        key = self.au.astype(np.int64) * self.N + self.av
        order = np.argsort(key, kind="stable")
        self.order = order
        ks = key[order]
        first = np.r_[True, ks[1:] != ks[:-1]]
        self.grp_start = np.where(first)[0]
        uk = ks[first]
        self.pair_u = (uk // self.N).astype(np.int64); self.pair_v = (uk % self.N).astype(np.int64)
        P = len(uk)
        self.csr = csr_matrix((np.ones(P), (self.pair_u, self.pair_v)), shape=(self.N, self.N))
        self.csr.sort_indices()
        # pairs are unique and sorted row-major, so pair i sits at csr.data[i]
        assert len(self.csr.data) == P and np.array_equal(self.csr.indices, self.pair_v)
        self.pair_pos = np.arange(P)
        self.pair_index = {}            # (u, v) -> pair id, built lazily
        self.arc_of_pair = None

    # ------------------------------------------------------------------ costs
    def edge_penalty(self, infra, pen):
        sc = self.G["sclass"]
        out = np.empty(self.m)
        for i_ in ("P", "B", "N"):
            for s_ in ("L", "T", "A"):
                mk = (infra == i_) & (sc == s_)
                out[mk] = penalty_of(i_, s_, pen)
        return out

    def arc_cost(self, infra, pen):
        """Perceived metres per arc. infra: array of P/B/N per edge (already including any upgrades)."""
        ep = self.edge_penalty(infra, pen)
        c = np.r_[ep, ep] * np.r_[self.length, self.length]
        c = np.where(self.contra & (np.r_[infra, infra] != "P"), np.r_[self.length, self.length] * CONTRAFLOW, c)
        c = np.where(self.walk & (np.r_[infra, infra] != "P"), np.r_[self.length, self.length] * WALK, c)
        return c

    def set_cost(self, arc_cost):
        """Load arc costs into the CSR (min over parallel arcs) and remember which arc wins per node pair."""
        c = arc_cost[self.order]
        mins = np.minimum.reduceat(c, self.grp_start)
        # arg-min arc per pair
        grp_id = np.repeat(np.arange(len(self.grp_start)), np.diff(np.r_[self.grp_start, len(c)]))
        is_min = c <= mins[grp_id] + 1e-9
        idx = np.where(is_min)[0]
        firsts = np.r_[True, grp_id[idx][1:] != grp_id[idx][:-1]]
        win = np.empty(len(self.grp_start), dtype=np.int64)
        win[grp_id[idx][firsts]] = self.order[idx[firsts]]
        self.arc_of_pair_pos = np.empty(len(self.csr.data), dtype=np.int64)
        self.arc_of_pair_pos[self.pair_pos] = win
        self.csr.data[self.pair_pos] = np.maximum(mins, 1e-3)
        self.cur_arc_cost = arc_cost

    def arc_between(self, a, b):
        """Winning arc for the node pair a->b under the current costs."""
        indptr, indices = self.csr.indptr, self.csr.indices
        lo, hi = indptr[a], indptr[a + 1]
        j = lo + np.searchsorted(indices[lo:hi], b)
        return self.arc_of_pair_pos[j]

    # ------------------------------------------------------------------ paths
    def sp_tree(self, origins, limit=np.inf):
        return dijkstra(self.csr, directed=True, indices=origins, return_predecessors=True, limit=limit)

    def path_arcs(self, pred_row, o, d):
        """List of arcs from o to d using one predecessor row; None if unreachable."""
        if o == d:
            return []
        if pred_row[d] < 0:
            return None
        nodes = [d]
        x = d
        while x != o:
            x = pred_row[x]
            if x < 0:
                return None
            nodes.append(x)
        nodes.reverse()
        indptr, indices, ap = self.csr.indptr, self.csr.indices, self.arc_of_pair_pos
        arcs = []
        for a, b in zip(nodes[:-1], nodes[1:]):
            lo, hi = indptr[a], indptr[a + 1]
            arcs.append(ap[lo + np.searchsorted(indices[lo:hi], b)])
        return arcs

    def assign(self, orig_nodes, pairs, chunk=60, keep_paths=False):
        """All-or-nothing assignment.
        pairs: list of (oi, di, flow) with oi/di indices into orig_nodes (cell -> graph node).
        Returns arc flows (2m), and optionally the arc list per pair."""
        by_o = {}
        for k, (oi, di, f) in enumerate(pairs):
            by_o.setdefault(oi, []).append((k, di, f))
        flows = np.zeros(2 * self.m)
        paths = [None] * len(pairs) if keep_paths else None
        os_ = sorted(by_o)
        for s in range(0, len(os_), chunk):
            block = os_[s:s + chunk]
            dist, pred = self.sp_tree([orig_nodes[o] for o in block])
            for r, o in enumerate(block):
                prow = pred[r]
                for k, di, f in by_o[o]:
                    arcs = self.path_arcs(prow, orig_nodes[o], orig_nodes[di])
                    if arcs is None:
                        continue
                    if f:
                        np.add.at(flows, arcs, f)
                    if keep_paths:
                        paths[k] = np.array(arcs, dtype=np.int64)
        return flows, paths
