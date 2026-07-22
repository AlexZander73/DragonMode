#!/usr/bin/env swift

import AppKit
import AVFoundation
import CoreVideo
import Foundation

struct FeatureScene {
    let imagePath: String
    let eyebrow: String
    let title: String
    let body: String
}

let repository = FileManager.default.currentDirectoryPath
let defaultOutput = "\(repository)/artifacts/showcase/dragon-mode-showcase-2026-07-22.mp4"
let outputPath = CommandLine.arguments.dropFirst().first ?? defaultOutput
let width = 1920
let height = 1080
let framesPerSecond: Int32 = 30
let openingDuration = 4.0
let sceneDuration = 3.0
let closingDuration = 4.0
let transitionDuration = 0.55

let scenes = [
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/01-lair.png",
        eyebrow: "ONE CALM LOOK",
        title: "A kinder way to face your finances",
        body: "See the whole picture without shame, pressure, or a bank connection."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/02-hoard.png",
        eyebrow: "YOUR HOARD, YOUR MAP",
        title: "Organise money around real life",
        body: "Group what matters into flexible chambers while keeping every value editable."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/03-movements.png",
        eyebrow: "FAST, FORGIVING INPUT",
        title: "Paste a statement. Keep control.",
        body: "Review movements, possible duplicates, and uncertain details before anything changes."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/04-quests.png",
        eyebrow: "HEALTHY PROGRESS",
        title: "Turn useful actions into quests",
        body: "Small optional steps build momentum. Missing a day never costs progress."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/05-scrying.png",
        eyebrow: "CLEARER PATTERNS",
        title: "See what changed without judgement",
        body: "Understand inflow, outflow, trends, and spending patterns at a glance."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/06-lore.png",
        eyebrow: "THIRTEEN LORE TOOLS",
        title: "Calculators that do the setup work",
        body: "Start from what you already mapped, then expose every input and assumption."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/07-interest.png",
        eyebrow: "IDLE VAULT",
        title: "Make interest easier to understand",
        body: "Illustrate earnings with real rates, dated promotions, and honest exclusions."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/08-atlas.png",
        eyebrow: "THE LIVING ATLAS",
        title: "Let the story grow with your journey",
        body: "Permanent chapters add wonder while every finance tool remains available."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/09-relics.png",
        eyebrow: "FAIR-PLAY REWARDS",
        title: "Cosmetic surprises, never paid power",
        body: "Visible odds, protection from bad luck, and no purchase path—ever."
    ),
    FeatureScene(
        imagePath: "\(repository)/artifacts/showcase/frames/10-creatures.png",
        eyebrow: "COMPANIONS WITHOUT PRESSURE",
        title: "Always welcome. Never punished.",
        body: "Friendly creatures wait without judgement and every earned bond remains yours."
    ),
]

func loadImage(_ path: String) throws -> NSImage {
    guard let image = NSImage(contentsOfFile: path) else {
        throw NSError(domain: "DragonModeVideo", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not load \(path)"])
    }
    return image
}

let openingImage = try loadImage("\(repository)/public/og.png")
let appIcon = try loadImage("\(repository)/public/art/app-icon-v2.png")
let sceneImages = try scenes.map { try loadImage($0.imagePath) }

try FileManager.default.createDirectory(
    at: URL(fileURLWithPath: outputPath).deletingLastPathComponent(),
    withIntermediateDirectories: true
)
if FileManager.default.fileExists(atPath: outputPath) {
    try FileManager.default.removeItem(atPath: outputPath)
}

let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: outputPath), fileType: .mp4)
let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 8_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: framesPerSecond,
        AVVideoMaxKeyFrameIntervalKey: framesPerSecond * 2,
    ],
]
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
writerInput.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: writerInput,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ]
)
guard writer.canAdd(writerInput) else {
    throw NSError(domain: "DragonModeVideo", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not add the video track"])
}
writer.add(writerInput)
guard writer.startWriting() else {
    throw writer.error ?? NSError(domain: "DragonModeVideo", code: 3)
}
writer.startSession(atSourceTime: .zero)

func clamp(_ value: Double, _ lower: Double = 0, _ upper: Double = 1) -> Double {
    min(upper, max(lower, value))
}

func smoothstep(_ value: Double) -> Double {
    let t = clamp(value)
    return t * t * (3 - 2 * t)
}

func topRect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> NSRect {
    NSRect(x: x, y: CGFloat(height) - y - h, width: w, height: h)
}

func fill(_ color: NSColor, rect: NSRect) {
    color.setFill()
    rect.fill()
}

func drawText(
    _ text: String,
    in rect: NSRect,
    font: NSFont,
    color: NSColor,
    alignment: NSTextAlignment = .left,
    lineSpacing: CGFloat = 7
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineSpacing = lineSpacing
    let string = NSAttributedString(string: text, attributes: [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph,
    ])
    string.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading])
}

func drawAspectFill(_ image: NSImage, in rect: NSRect, alpha: CGFloat = 1, zoom: CGFloat = 1, horizontalAnchor: CGFloat = 0.5) {
    let source = image.size
    let baseScale = max(rect.width / source.width, rect.height / source.height) * zoom
    let drawnSize = NSSize(width: source.width * baseScale, height: source.height * baseScale)
    let drawnRect = NSRect(
        x: rect.minX + (rect.width - drawnSize.width) * horizontalAnchor,
        y: rect.midY - drawnSize.height / 2,
        width: drawnSize.width,
        height: drawnSize.height
    )
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(rect: rect).addClip()
    image.draw(in: drawnRect, from: .zero, operation: .sourceOver, fraction: alpha, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
}

func drawStars(alpha: CGFloat) {
    let stars: [(CGFloat, CGFloat, CGFloat)] = [
        (760, 90, 3), (905, 180, 2), (1095, 80, 2), (1280, 155, 4),
        (1510, 94, 2), (1710, 210, 3), (820, 850, 2), (1040, 940, 3),
        (1340, 885, 2), (1580, 960, 4), (1800, 820, 2),
    ]
    for (x, y, radius) in stars {
        fill(NSColor(calibratedRed: 0.57, green: 0.88, blue: 1, alpha: alpha), rect: topRect(x, y, radius, radius))
    }
}

func drawFeatureScene(index: Int, alpha: CGFloat, progress: Double) {
    guard alpha > 0 else { return }
    let scene = scenes[index]
    let image = sceneImages[index]

    NSGraphicsContext.saveGraphicsState()
    let layer = NSShadow()
    layer.shadowColor = NSColor.black.withAlphaComponent(0.45 * alpha)
    layer.shadowBlurRadius = 30
    layer.shadowOffset = NSSize(width: 0, height: -12)
    layer.set()

    let drift = CGFloat(sin(progress * .pi) * 8)
    let phoneOuter = topRect(154 + drift, 46, 466, 988)
    NSColor(calibratedRed: 0.015, green: 0.035, blue: 0.075, alpha: alpha).setFill()
    NSBezierPath(roundedRect: phoneOuter, xRadius: 42, yRadius: 42).fill()
    NSGraphicsContext.restoreGraphicsState()

    let phoneInner = topRect(172 + drift, 64, 430, 952)
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: phoneInner, xRadius: 30, yRadius: 30).addClip()
    image.draw(in: phoneInner, from: .zero, operation: .sourceOver, fraction: alpha, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()

    let reveal = CGFloat(smoothstep(progress / 0.30)) * alpha
    drawText(scene.eyebrow, in: topRect(760, 270, 980, 44), font: .systemFont(ofSize: 24, weight: .bold), color: NSColor(calibratedRed: 0.38, green: 0.86, blue: 0.92, alpha: reveal), lineSpacing: 2)
    drawText(scene.title, in: topRect(755, 330, 990, 190), font: NSFont(name: "Georgia-Bold", size: 66) ?? .systemFont(ofSize: 66, weight: .bold), color: NSColor(calibratedRed: 1, green: 0.87, blue: 0.48, alpha: reveal), lineSpacing: 8)
    drawText(scene.body, in: topRect(760, 555, 900, 150), font: .systemFont(ofSize: 32, weight: .medium), color: NSColor(calibratedWhite: 0.93, alpha: reveal), lineSpacing: 11)

    fill(NSColor(calibratedRed: 0.96, green: 0.70, blue: 0.20, alpha: 0.75 * reveal), rect: topRect(760, 735, 92, 4))
    drawText("Manual tracking  •  No bank connection", in: topRect(760, 770, 920, 42), font: .systemFont(ofSize: 22, weight: .semibold), color: NSColor(calibratedWhite: 0.72, alpha: reveal), lineSpacing: 2)

    let dotWidth: CGFloat = 18
    let dotGap: CGFloat = 14
    let totalWidth = CGFloat(scenes.count) * dotWidth + CGFloat(scenes.count - 1) * dotGap
    let dotStart = 760 + (900 - totalWidth) / 2
    for dotIndex in scenes.indices {
        let active = dotIndex == index
        let dotColor = active
            ? NSColor(calibratedRed: 0.98, green: 0.72, blue: 0.22, alpha: reveal)
            : NSColor(calibratedWhite: 0.48, alpha: 0.45 * reveal)
        dotColor.setFill()
        NSBezierPath(ovalIn: topRect(dotStart + CGFloat(dotIndex) * (dotWidth + dotGap), 915, dotWidth, dotWidth)).fill()
    }
}

func drawOpening(progress: Double, alpha: CGFloat) {
    let zoom = CGFloat(1 + 0.018 * smoothstep(progress))
    drawAspectFill(openingImage, in: topRect(0, 0, CGFloat(width), CGFloat(height)), alpha: alpha, zoom: zoom, horizontalAnchor: 0)
    let overlay = NSGradient(colors: [
        NSColor.clear,
        NSColor(calibratedRed: 0.01, green: 0.04, blue: 0.10, alpha: 0.70 * alpha),
    ])!
    overlay.draw(in: topRect(0, 690, CGFloat(width), 390), angle: -90)
    drawText("PROTECT YOUR HOARD. REST EASIER.", in: topRect(70, 922, 1000, 46), font: .systemFont(ofSize: 27, weight: .bold), color: NSColor(calibratedRed: 1, green: 0.86, blue: 0.45, alpha: alpha), lineSpacing: 2)
}

func drawClosing(progress: Double, alpha: CGFloat) {
    let iconSize: CGFloat = 570 + CGFloat(20 * smoothstep(progress))
    let iconRect = topRect(1060, (CGFloat(height) - iconSize) / 2, iconSize, iconSize)
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: iconRect, xRadius: 112, yRadius: 112).addClip()
    appIcon.draw(in: iconRect, from: .zero, operation: .sourceOver, fraction: alpha, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
    drawText("DRAGON MODE", in: topRect(190, 285, 800, 54), font: .systemFont(ofSize: 25, weight: .bold), color: NSColor(calibratedRed: 0.38, green: 0.86, blue: 0.92, alpha: alpha), lineSpacing: 2)
    drawText("Protect your hoard.\nRest easier.", in: topRect(180, 355, 850, 220), font: NSFont(name: "Georgia-Bold", size: 72) ?? .systemFont(ofSize: 72, weight: .bold), color: NSColor(calibratedRed: 1, green: 0.87, blue: 0.48, alpha: alpha), lineSpacing: 10)
    drawText("Friendly manual financial tracking—built for clarity, curiosity, and calm.", in: topRect(190, 625, 770, 130), font: .systemFont(ofSize: 30, weight: .medium), color: NSColor(calibratedWhite: 0.92, alpha: alpha), lineSpacing: 10)
    drawText("Educational illustrations only. Not financial advice.", in: topRect(190, 835, 800, 40), font: .systemFont(ofSize: 21, weight: .semibold), color: NSColor(calibratedWhite: 0.66, alpha: alpha), lineSpacing: 2)
}

func makePixelBuffer(frame: Int) throws -> CVPixelBuffer {
    guard let pool = adaptor.pixelBufferPool else {
        throw NSError(domain: "DragonModeVideo", code: 4, userInfo: [NSLocalizedDescriptionKey: "The pixel buffer pool is unavailable"])
    }
    var optionalBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer)
    guard status == kCVReturnSuccess, let pixelBuffer = optionalBuffer else {
        throw NSError(domain: "DragonModeVideo", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Could not create a video frame"])
    }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
    guard let destination = CVPixelBufferGetBaseAddress(pixelBuffer) else {
        throw NSError(domain: "DragonModeVideo", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not access frame memory"])
    }
    let bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    guard let drawingContext = CGContext(
        data: destination,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: bitmapInfo
    ) else {
        throw NSError(domain: "DragonModeVideo", code: 6, userInfo: [NSLocalizedDescriptionKey: "Could not create a drawing surface"])
    }
    let graphics = NSGraphicsContext(cgContext: drawingContext, flipped: false)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphics
    graphics.imageInterpolation = .high

    let fullRect = NSRect(x: 0, y: 0, width: width, height: height)
    let background = NSGradient(colors: [
        NSColor(calibratedRed: 0.02, green: 0.07, blue: 0.14, alpha: 1),
        NSColor(calibratedRed: 0.04, green: 0.18, blue: 0.29, alpha: 1),
    ])!
    background.draw(in: fullRect, angle: 12)
    drawStars(alpha: 0.55)

    let time = Double(frame) / Double(framesPerSecond)
    let featureStart = openingDuration
    let featureEnd = featureStart + Double(scenes.count) * sceneDuration

    if time < openingDuration {
        let progress = time / openingDuration
        let fadeOut = time > openingDuration - transitionDuration
            ? 1 - smoothstep((time - (openingDuration - transitionDuration)) / transitionDuration)
            : 1
        drawOpening(progress: progress, alpha: CGFloat(fadeOut))
        if time >= openingDuration - transitionDuration {
            let incoming = smoothstep((time - (openingDuration - transitionDuration)) / transitionDuration)
            drawFeatureScene(index: 0, alpha: CGFloat(incoming), progress: 0)
        }
    } else if time < featureEnd {
        let featureTime = time - featureStart
        let sceneIndex = min(scenes.count - 1, Int(featureTime / sceneDuration))
        let localTime = featureTime - Double(sceneIndex) * sceneDuration
        let progress = localTime / sceneDuration
        var alpha = 1.0
        if localTime < transitionDuration, sceneIndex > 0 {
            alpha = smoothstep(localTime / transitionDuration)
            drawFeatureScene(index: sceneIndex - 1, alpha: CGFloat(1 - alpha), progress: 1)
        }
        if localTime > sceneDuration - transitionDuration, sceneIndex == scenes.count - 1 {
            alpha = 1 - smoothstep((localTime - (sceneDuration - transitionDuration)) / transitionDuration)
        }
        drawFeatureScene(index: sceneIndex, alpha: CGFloat(alpha), progress: progress)
        if sceneIndex == scenes.count - 1, localTime > sceneDuration - transitionDuration {
            let incoming = smoothstep((localTime - (sceneDuration - transitionDuration)) / transitionDuration)
            drawClosing(progress: 0, alpha: CGFloat(incoming))
        }
    } else {
        let closingProgress = (time - featureEnd) / closingDuration
        drawClosing(progress: closingProgress, alpha: 1)
    }

    graphics.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    return pixelBuffer
}

let totalDuration = openingDuration + Double(scenes.count) * sceneDuration + closingDuration
let totalFrames = Int(ceil(totalDuration * Double(framesPerSecond)))

for frame in 0..<totalFrames {
    while !writerInput.isReadyForMoreMediaData {
        try await Task.sleep(for: .milliseconds(2))
    }
    autoreleasepool {
        do {
            let buffer = try makePixelBuffer(frame: frame)
            let presentationTime = CMTime(value: Int64(frame), timescale: framesPerSecond)
            if !adaptor.append(buffer, withPresentationTime: presentationTime) {
                fatalError(writer.error?.localizedDescription ?? "Could not append frame \(frame)")
            }
        } catch {
            fatalError(error.localizedDescription)
        }
    }
    if frame % Int(framesPerSecond * 5) == 0 {
        let seconds = Double(frame) / Double(framesPerSecond)
        print(String(format: "Rendered %.0f / %.0f seconds", seconds, totalDuration))
    }
}

writerInput.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else {
    throw writer.error ?? NSError(domain: "DragonModeVideo", code: 7, userInfo: [NSLocalizedDescriptionKey: "Video export did not complete"])
}

print("Created \(outputPath)")
