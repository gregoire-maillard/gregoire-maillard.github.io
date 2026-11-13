import UIKit
import WebKit
import Capacitor
import WidgetKit
import StoreKit

// APP-9g: the app's own view controller registers WidgetBridge, the small plugin that hands the home-screen widget
// its data: turkish-app.js calls WidgetBridge.update({ json }) and the JSON lands in the shared App Group, where
// DailyTurkishWidget reads it. APP-9j: requestReview() shows Apple's rating prompt (iOS decides whether it appears,
// at most three times a year), which turkish-app.js asks for at a happy moment.
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        // APP-9m: a long press on a link shows no preview card with the page's address.
        webView?.allowsLinkPreview = false
    }

    // APP-9q: no drag and drop either. A long press then a slight move lifted a link off the page, with its
    // capacitor:// address on it ("the button flies away"). turkish-app.css also sets -webkit-user-drag: none.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let webView = webView { turnOffDrag(in: webView) }
    }

    private func turnOffDrag(in view: UIView) {
        for case let drag as UIDragInteraction in view.interactions { drag.isEnabled = false }
        for sub in view.subviews { turnOffDrag(in: sub) }
    }
}

// APP-9q: no context menu on a long press, whatever the element (the box with the page's capacitor:// address and
// Open / Copy / Share). Capacitor's delegate doesn't answer this question, so iOS showed its own menu; answering
// nil means no menu. Added to Capacitor's class, which stays the web view's UI delegate (alerts, confirms).
extension WebViewDelegationHandler {
    @MainActor
    @objc(webView:contextMenuConfigurationForElement:completionHandler:)
    public func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo,
                        completionHandler: @escaping @MainActor @Sendable (UIContextMenuConfiguration?) -> Void) {
        completionHandler(nil)
    }
}

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    @objc public func update(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is missing")
            return
        }
        UserDefaults(suiteName: "group.app.dailyturkish")?.set(json, forKey: "widget")
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc public func requestReview(_ call: CAPPluginCall) {
        Task { @MainActor in
            let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene
            if let scene = scene {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            }
            call.resolve()
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
