import Foundation
import UIKit
import Vision
import VisionKit
import Capacitor

/// Card scanning on iPhone: Apple Vision text recognition (accurate level,
/// language correction, en-US) on the full-resolution image, plus the
/// VisionKit document camera, which finds the card's edges and flattens the
/// page (crop + perspective/deskew) before recognition.
/// Each recognized line comes back with a normalized box (top-left origin)
/// so the app can rebuild rows and columns.
@objc(OrsyncOcrPlugin)
public class OrsyncOcrPlugin: CAPPlugin, CAPBridgedPlugin, VNDocumentCameraViewControllerDelegate {
    public let identifier = "OrsyncOcrPlugin"
    public let jsName = "OrsyncOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanDocument", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isDocumentScannerAvailable", returnType: CAPPluginReturnPromise),
    ]

    private var scanCall: CAPPluginCall?

    @objc func recognize(_ call: CAPPluginCall) {
        guard var b64 = call.getString("image") else {
            call.reject("No image.")
            return
        }
        if b64.hasPrefix("data:"), let comma = b64.firstIndex(of: ",") {
            b64 = String(b64[b64.index(after: comma)...])
        }
        guard let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters), let image = UIImage(data: data) else {
            call.reject("Couldn't read that image.")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                call.resolve(["lines": try OrsyncOcrPlugin.recognizeLines(image)])
            } catch {
                call.reject("Text recognition failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func isDocumentScannerAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": VNDocumentCameraViewController.isSupported])
    }

    @objc func scanDocument(_ call: CAPPluginCall) {
        guard VNDocumentCameraViewController.isSupported else {
            call.reject("The document scanner isn't available on this device.")
            return
        }
        DispatchQueue.main.async {
            self.scanCall = call
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            self.bridge?.viewController?.present(scanner, animated: true)
        }
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
        controller.dismiss(animated: true)
        guard let call = scanCall else { return }
        scanCall = nil
        var images: [UIImage] = []
        for i in 0..<scan.pageCount { images.append(scan.imageOfPage(at: i)) }
        DispatchQueue.global(qos: .userInitiated).async {
            var pages: [[String: Any]] = []
            for image in images {
                pages.append(["lines": (try? OrsyncOcrPlugin.recognizeLines(image)) ?? []])
            }
            call.resolve(["pages": pages])
        }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        controller.dismiss(animated: true)
        scanCall?.resolve(["pages": [], "cancelled": true])
        scanCall = nil
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
        controller.dismiss(animated: true)
        scanCall?.reject("Scanning failed: \(error.localizedDescription)")
        scanCall = nil
    }

    static func recognizeLines(_ image: UIImage) throws -> [[String: Any]] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "OrsyncOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "No bitmap in that image."])
        }
        var lines: [[String: Any]] = []
        let request = VNRecognizeTextRequest { req, _ in
            for case let obs as VNRecognizedTextObservation in req.results ?? [] {
                guard let best = obs.topCandidates(1).first else { continue }
                let b = obs.boundingBox // normalized, bottom-left origin
                lines.append([
                    "text": best.string,
                    "confidence": Double(best.confidence),
                    "x": Double(b.minX),
                    "y": Double(1 - b.maxY),
                    "w": Double(b.width),
                    "h": Double(b.height),
                ])
            }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = ["en-US"]
        if #available(iOS 16.0, *) {
            request.revision = VNRecognizeTextRequestRevision3
            request.automaticallyDetectsLanguage = false
        }
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: cgOrientation(image.imageOrientation), options: [:])
        try handler.perform([request])
        return lines
    }

    private static func cgOrientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
        switch o {
        case .up: return .up
        case .upMirrored: return .upMirrored
        case .down: return .down
        case .downMirrored: return .downMirrored
        case .left: return .left
        case .leftMirrored: return .leftMirrored
        case .right: return .right
        case .rightMirrored: return .rightMirrored
        @unknown default: return .up
        }
    }
}
