var should = require('should')
var helper = require('node-red-node-test-helper')
var colourNode = require('../colour_convert.js')

helper.init(require.resolve('node-red'))

describe('colour-convert node', function () {
    this.timeout(10000)

    beforeEach(function (done) {
        helper.startServer(done)
    })

    afterEach(function (done) {
        helper.unload().then(function () {
            helper.stopServer(done)
        })
    })

    function testFlow(config, payload, assert, done) {
        var flow = [
            Object.assign({ id: 'n1', type: 'colourconvert', wires: [['n2']] }, config),
            { id: 'n2', type: 'helper' }
        ]
        helper.load(colourNode, flow, function () {
            var n1 = helper.getNode('n1')
            var n2 = helper.getNode('n2')
            n2.on('input', function (msg) {
                try {
                    assert(msg.payload)
                    done()
                } catch (err) {
                    done(err)
                }
            })
            n1.receive({ payload: payload })
        })
    }

    it('loads and registers', function (done) {
        var flow = [{ id: 'n1', type: 'colourconvert', name: 'c', format: 'rgb' }]
        helper.load(colourNode, flow, function () {
            helper.getNode('n1').should.have.property('name', 'c')
            done()
        })
    })

    it('converts an RGB string', function (done) {
        testFlow({ format: 'rgb' }, '255,100,0', function (p) {
            p.rgb.should.eql({ r: 255, g: 100, b: 0 })
            p.hex.should.equal('#ff6400')
            p.should.have.property('hsl')
            p.should.have.property('xy')
        }, done)
    })

    it('parses a hex RGB value', function (done) {
        testFlow({ format: 'rgb' }, '#ff6400', function (p) {
            p.rgb.should.eql({ r: 255, g: 100, b: 0 })
        }, done)
    })

    it('converts HSL to RGB', function (done) {
        testFlow({ format: 'hsl' }, '0,100,50', function (p) {
            p.rgb.should.eql({ r: 255, g: 0, b: 0 })
            p.hex.should.equal('#ff0000')
        }, done)
    })

    it('converts CIE xy to RGB at full brightness', function (done) {
        testFlow({ format: 'xy' }, '0.64,0.33', function (p) {
            p.rgb.r.should.be.above(200)
            p.rgb.r.should.be.above(p.rgb.g)
            p.rgb.r.should.be.above(p.rgb.b)
        }, done)
    })

    it('reads the value from a typed (str) config field', function (done) {
        testFlow({ format: 'rgb', value: '0,0,255', valueType: 'str' }, 'ignored', function (p) {
            p.rgb.should.eql({ r: 0, g: 0, b: 255 })
            p.hex.should.equal('#0000ff')
        }, done)
    })

    it('errors on an unparseable value', function (done) {
        var flow = [{ id: 'n1', type: 'colourconvert', format: 'rgb', wires: [[]] }]
        helper.load(colourNode, flow, function () {
            var n1 = helper.getNode('n1')
            n1.error = function (err) {
                should.exist(err)
                done()
            }
            n1.receive({ payload: 'not-a-colour' })
        })
    })
})
