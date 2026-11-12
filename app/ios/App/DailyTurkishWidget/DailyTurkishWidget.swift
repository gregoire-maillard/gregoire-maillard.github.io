// Daily Turkish home-screen widget (APP-9g): the streak and the word of the day.
//
// The app writes a small JSON to the shared App Group "group.app.dailyturkish" (key "widget", see WidgetBridge in
// App/SceneDelegate.swift and app/src/turkish-app.js). This widget reads it, works out from the date whether today
// already counts for the streak, and picks that day's word from the list the app sent (a week ahead), so it stays
// right for a few days even when the app isn't opened. It refreshes at each new learning day.
import WidgetKit
import SwiftUI

private let appGroup = "group.app.dailyturkish"
private let brandRed = Color(red: 0.890, green: 0.294, blue: 0.310)
private let ink = Color(red: 0.114, green: 0.114, blue: 0.106)
private let muted = Color(red: 0.42, green: 0.42, blue: 0.40)

struct WidgetWord: Decodable {
    let day: String
    let tr: String
    let en: String
}

struct WidgetData: Decodable {
    let streak: Int
    let last: String?
    let hour: Int
    let words: [WidgetWord]
}

struct DTEntry: TimelineEntry {
    let date: Date
    let streak: Int
    let doneToday: Bool
    let word: String
    let meaning: String
}

private func learningDay(_ date: Date, hour: Int) -> String {
    let cal = Calendar.current
    let shifted = cal.date(byAdding: .hour, value: -hour, to: date) ?? date
    let c = cal.dateComponents([.year, .month, .day], from: shifted)
    return String(format: "%04d-%02d-%02d", c.year ?? 2000, c.month ?? 1, c.day ?? 1)
}

private func loadData() -> WidgetData? {
    guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "widget"),
          let raw = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetData.self, from: raw)
}

private func entry(at date: Date, data: WidgetData?) -> DTEntry {
    guard let d = data else {
        return DTEntry(date: date, streak: 0, doneToday: false, word: "merhaba", meaning: "hello")
    }
    let today = learningDay(date, hour: d.hour)
    let yesterday = learningDay(date.addingTimeInterval(-86400), hour: d.hour)
    var streak = 0
    var done = false
    if let last = d.last {
        if last == today { streak = d.streak; done = true } else if last == yesterday { streak = d.streak }
    }
    let w = d.words.first(where: { $0.day == today }) ?? d.words.last
    return DTEntry(date: date, streak: streak, doneToday: done, word: w?.tr ?? "merhaba", meaning: w?.en ?? "hello")
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> DTEntry {
        DTEntry(date: Date(), streak: 7, doneToday: true, word: "merhaba", meaning: "hello")
    }

    func getSnapshot(in context: Context, completion: @escaping (DTEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : entry(at: Date(), data: loadData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DTEntry>) -> Void) {
        let data = loadData()
        let now = Date()
        var entries = [entry(at: now, data: data)]
        // One entry at the start of each of the next three learning days.
        let hour = data?.hour ?? 4
        let cal = Calendar.current
        var next = cal.date(bySettingHour: hour, minute: 0, second: 5, of: now) ?? now
        if next <= now { next = cal.date(byAdding: .day, value: 1, to: next) ?? now.addingTimeInterval(86400) }
        for _ in 0..<3 {
            entries.append(entry(at: next, data: data))
            next = cal.date(byAdding: .day, value: 1, to: next) ?? next.addingTimeInterval(86400)
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct StreakView: View {
    let entry: DTEntry
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "flame.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(entry.streak > 0 ? Color.orange : muted.opacity(0.5))
            VStack(alignment: .leading, spacing: 0) {
                Text(entry.streak > 0 ? "\(entry.streak) day\(entry.streak == 1 ? "" : "s")" : "No streak")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(ink)
                Text(entry.streak == 0 ? "Start one today" : entry.doneToday ? "Done today" : "Keep it today")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(entry.doneToday ? Color(red: 0.18, green: 0.49, blue: 0.31) : brandRed)
            }
        }
    }
}

struct WordView: View {
    let entry: DTEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("WORD OF THE DAY")
                .font(.system(size: 9.5, weight: .bold))
                .foregroundColor(muted)
            Text(entry.word)
                .font(.system(size: 20, weight: .heavy))
                .foregroundColor(brandRed)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(entry.meaning)
                .font(.system(size: 12.5, weight: .medium))
                .foregroundColor(ink)
                .lineLimit(2)
        }
    }
}

struct DTWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: DTEntry
    var body: some View {
        Group {
            if family == .systemMedium {
                HStack(alignment: .center, spacing: 14) {
                    StreakView(entry: entry)
                    Rectangle().fill(muted.opacity(0.2)).frame(width: 1)
                    WordView(entry: entry)
                    Spacer(minLength: 0)
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    StreakView(entry: entry)
                    Spacer(minLength: 0)
                    WordView(entry: entry)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetBackground(Color.white)
    }
}

extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self.padding().background(color)
        }
    }
}

@main
struct DailyTurkishHomeWidget: Widget {
    let kind = "DailyTurkishWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DTWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Turkish")
        .description("Your streak and the word of the day.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
