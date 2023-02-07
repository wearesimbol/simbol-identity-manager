import {THREE} from '../libs/three'
import {GLTFLoader}  from 'three/examples/jsm/loaders/GLTFLoader'
import {DRACOLoader} from '../libs/DRACOLoader'
import {Reflector} from '../libs/Reflector'

const COLORS = [
	'#F7F6F5',
	'#3588B5',
	'#F9D656',
	'#E2653F',
	'#6FC47B',
	'#9A865D',
	'#545454',
	'#0B1821'
]

class RoomScene {

	constructor(canvas) {
		this.animateFunctions = []
		this.onResize = this.onResize.bind(this)
		this.render = this.render.bind(this)
		this.setUpCanvas(canvas)
	}

	setUpCanvas(canvas) {
		this.canvas = canvas
		const wrapper = canvas.parentElement
		const width = wrapper.clientWidth
		const height = wrapper.clientHeight

		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(90, width / height, 0.01, 100)
		this.scene.add(this.camera)

		this.renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		})
		// Last parameter adds pixel units to canvas element
		this.renderer.setSize(width, height, true)
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.gammaOutput = true
		this.renderer.gammaFactor = 2.2
		this.renderer.vr.enabled = true

		const mirror = this.createMirror()
		mirror.position.set(0, 1.5, -1.8)
		this.scene.add(mirror)

		const light = new THREE.AmbientLight(0xFFFFFF, 0.3)
		this.spotLight = new THREE.SpotLight(0xFFFFFF, 1.7, 0, Math.PI / 4, 1, 2)
		this.spotLight.position.set(0, 7, 1)
		this.spotLight.target = mirror
		// this.helper = new SpotLightHelper(this.spotLight)
		this.scene.add(light, this.spotLight)
	}

	init() {
		window.addEventListener('resize', this.onResize, false)
		this.setModel()
		this.animate()
	}

	setModel() {
		return new Promise((resolve) => {
			const loader = new GLTFLoader()
			loader.setDRACOLoader(new DRACOLoader())
			loader.load('dist/assets/models/room.glb', (model) => {
				console.log(model)
				window.scene = this.scene
				window.renderer = this.renderer
				model.scene.name = 'Simbol-Room'
				this.scene.add(model.scene)
				resolve(model.scene)
			}, null, console.warn)
		})
	}

	createMirror() {
		const plane = new THREE.PlaneBufferGeometry(2, 3)
		const mirror = new Reflector(plane, {
			clipBias: 0.003,
			textureWidth: this.canvas.parentElement.clientWidth * window.devicePixelRatio,
			textureHeight: this.canvas.parentElement.clientHeight * window.devicePixelRatio,
			recursion: 1
		})
		const colorPicker = this._createColorPicker()
		mirror.add(colorPicker)
		window.mirror = mirror
		return mirror
	}

	_createColorPicker() {
		const colorsEntries = COLORS.entries()
		const planeGeometry = new THREE.PlaneBufferGeometry(0.28, 1.7)
		const planeMaterial = new THREE.MeshBasicMaterial({
			color: 0x7d8991
		})
		const plane = new THREE.Mesh(planeGeometry, planeMaterial)
		plane.position.set(0.86, 0.65, 0)

		const initialPosition = 0.85 - 0.08 * 2
		for (const [i, color] of colorsEntries) {
			const yPosition = initialPosition - i * 0.2
			const circleGeometry = new THREE.CircleBufferGeometry(0.08, 32)
			const circleMaterial = new THREE.MeshBasicMaterial()
			circleMaterial.color.setStyle(color)
			circleMaterial.color.convertSRGBToLinear()
			const circle = new THREE.Mesh(circleGeometry, circleMaterial)
			circle.position.setY(yPosition)
			plane.add(circle)
		}

		return plane
	}

	render(timestamp) {
		for (const func of this.animateFunctions) {
			func(timestamp)
		}
		this.renderer.render(this.scene, this.camera);
	}

	onResize() {
		const wrapper = this.canvas.parentElement
		const width = wrapper.clientWidth;
		const height = wrapper.clientHeight;
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(width, height, true);
	}

	animate() {
		this.renderer.setAnimationLoop(this.render.bind(this))
	}

	stop() {
		this.renderer.setAnimationLoop(null)
	}
}

export {RoomScene}