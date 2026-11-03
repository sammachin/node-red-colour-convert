

module.exports = function (RED) {

    // ---- Colour maths (sRGB / D65) ---------------------------------------

    function clamp(v, lo, hi) {
        return Math.min(hi, Math.max(lo, v))
    }

    function round(v, dp) {
        const f = Math.pow(10, dp)
        return Math.round(v * f) / f
    }

    // RGB (0-255) -> HSL (h 0-360, s/l 0-100)
    function rgbToHsl({ r, g, b }) {
        r /= 255; g /= 255; b /= 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const d = max - min
        let h = 0
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6
            else if (max === g) h = (b - r) / d + 2
            else h = (r - g) / d + 4
            h *= 60
            if (h < 0) h += 360
        }
        const l = (max + min) / 2
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
        return { h: round(h, 1), s: round(s * 100, 1), l: round(l * 100, 1) }
    }

    // HSL (h 0-360, s/l 0-100) -> RGB (0-255)
    function hslToRgb({ h, s, l }) {
        h = ((h % 360) + 360) % 360
        s /= 100; l /= 100
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs((h / 60) % 2 - 1))
        const m = l - c / 2
        let r = 0, g = 0, b = 0
        if (h < 60) { r = c; g = x }
        else if (h < 120) { r = x; g = c }
        else if (h < 180) { g = c; b = x }
        else if (h < 240) { g = x; b = c }
        else if (h < 300) { r = x; b = c }
        else { r = c; b = x }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        }
    }

    // sRGB companding helpers
    function gammaExpand(c) {
        c /= 255
        return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92
    }
    function gammaCompress(c) {
        c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
        return Math.round(clamp(c, 0, 1) * 255)
    }

    // RGB (0-255) -> CIE xy chromaticity + Y luminance (0-1)
    function rgbToXy({ r, g, b }) {
        const R = gammaExpand(r), G = gammaExpand(g), B = gammaExpand(b)
        const X = R * 0.4124 + G * 0.3576 + B * 0.1805
        const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
        const Z = R * 0.0193 + G * 0.1192 + B * 0.9505
        const sum = X + Y + Z
        if (sum === 0) return { x: 0, y: 0, Y: 0 }
        return { x: round(X / sum, 4), y: round(Y / sum, 4), Y: round(Y, 4) }
    }

    // CIE xy (+ optional Y luminance) -> RGB (0-255).
    // Without a Y the colour is returned at full brightness (max channel = 255).
    function xyToRgb({ x, y, Y }) {
        const scaleToMax = (Y == null)
        if (Y == null) Y = 1
        if (y === 0) return { r: 0, g: 0, b: 0 }
        const X = (Y / y) * x
        const Z = (Y / y) * (1 - x - y)
        let R = X * 3.2406 - Y * 1.5372 - Z * 0.4986
        let G = -X * 0.9689 + Y * 1.8758 + Z * 0.0415
        let B = X * 0.0557 - Y * 0.2040 + Z * 1.0570
        R = Math.max(0, R); G = Math.max(0, G); B = Math.max(0, B)
        if (scaleToMax) {
            const max = Math.max(R, G, B)
            if (max > 0) { R /= max; G /= max; B /= max }
        }
        return { r: gammaCompress(R), g: gammaCompress(G), b: gammaCompress(B) }
    }

    // ---- Input parsing ----------------------------------------------------

    function toHex({ r, g, b }) {
        const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
        return '#' + h(r) + h(g) + h(b)
    }

    function parseRgb(value) {
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) return { r: +value[0], g: +value[1], b: +value[2] }
            return { r: +value.r, g: +value.g, b: +value.b }
        }
        const str = String(value).trim()
        const hex = str.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16)
            }
        }
        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16)
            }
        }
        const parts = str.split(/[ ,]+/).map(Number)
        if (parts.length >= 3) return { r: parts[0], g: parts[1], b: parts[2] }
        throw new Error('Could not parse RGB value: ' + str)
    }

    function parseHsl(value) {
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) return { h: +value[0], s: +value[1], l: +value[2] }
            return { h: +value.h, s: +value.s, l: +value.l }
        }
        const parts = String(value).replace(/[^0-9., -]/g, '').split(/[ ,]+/).map(Number)
        if (parts.length >= 3) return { h: parts[0], s: parts[1], l: parts[2] }
        throw new Error('Could not parse HSL value: ' + value)
    }

    function parseXy(value) {
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) return { x: +value[0], y: +value[1], Y: value[2] != null ? +value[2] : null }
            return { x: +value.x, y: +value.y, Y: value.Y != null ? +value.Y : null }
        }
        const parts = String(value).split(/[ ,]+/).map(Number)
        if (parts.length >= 2) return { x: parts[0], y: parts[1], Y: parts.length >= 3 ? parts[2] : null }
        throw new Error('Could not parse CIE xy value: ' + value)
    }

    function validRgb({ r, g, b }) {
        return [r, g, b].every((n) => Number.isFinite(n))
    }

    // Build the full set of representations from an RGB triple.
    function buildPayload(rgb) {
        return {
            rgb: { r: rgb.r, g: rgb.g, b: rgb.b },
            hex: toHex(rgb),
            hsl: rgbToHsl(rgb),
            xy: rgbToXy(rgb)
        }
    }

    // ---- Node -------------------------------------------------------------

    function ColourConvert(config) {
        RED.nodes.createNode(this, config)
        const node = this

        node.on('input', function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments) }
            try {
                const format = config.format || 'rgb'

                // Value from typed input, or fall back to msg.payload
                let value
                if (config.value !== undefined && config.value !== '') {
                    RED.util.evaluateNodeProperty(config.value, config.valueType || 'str', node, msg, function (err, v) {
                        if (err) { throw err }
                        value = v
                    })
                } else {
                    value = msg.payload
                }

                let rgb
                if (format === 'rgb') {
                    rgb = parseRgb(value)
                } else if (format === 'hsl') {
                    rgb = hslToRgb(parseHsl(value))
                } else if (format === 'xy') {
                    rgb = xyToRgb(parseXy(value))
                } else {
                    throw new Error('Unknown input format: ' + format)
                }

                if (!validRgb(rgb)) {
                    throw new Error('Invalid colour value for format "' + format + '"')
                }
                rgb.r = clamp(Math.round(rgb.r), 0, 255)
                rgb.g = clamp(Math.round(rgb.g), 0, 255)
                rgb.b = clamp(Math.round(rgb.b), 0, 255)

                msg.payload = buildPayload(rgb)
                send(msg)
                done()
            } catch (e) {
                if (done) { done(e) } else { node.error(e, msg) }
            }
        })
    }

    RED.nodes.registerType('colourconvert', ColourConvert)
}
