import {THREE} from '../libs/three'
import {OrbitControls}  from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader}  from 'three/examples/jsm/loaders/GLTFLoader'
import {DRACOLoader} from '../libs/DRACOLoader'

const AVATAR_URL = 'https://avatar.simbol.io/avatar.glb'
const COLORS = [
	'#F7F6F5',
	'#5399ba',
	'#F9D656',
	'#E2653F',
	'#6FC47B',
	'#9A865D',
	'#545454',
	'#0B1821'
]

const MATERIALS = [
	Body,
	Eyebrow,
	Hair,
	InnerEye,
	Marks,
	MouthNose,
	OuterEye,
	Skin
]

class AvatarCreator {

	constructor(canvas) {
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
		this.scene.background = new THREE.Color(0xf2f2f2)
		this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 100)
		this.camera.position.set(0, 2, 0)

		this.renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		})
		// Last parameter adds pixel units to canvas element
		this.renderer.setSize(width, height, true)
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.gammaOutput = true
		this.renderer.gammaFactor = 2.2
		window.addEventListener('resize', this.onResize, false)

		const light = new THREE.AmbientLight(0xFFFFFF);
		this.scene.add(light);

		this.controls = new OrbitControls(this.camera, canvas)
		this.controls.minPolarAngle = Math.PI / 2
		this.controls.maxPolarAngle = Math.PI / 2
		this.controls.minZoom = 1
		this.controls.update()

		this.render()
	}

	setModel(url) {
		url = url || AVATAR_URL
		if (this.source && this.source === url) {
			return
		}
		const previousModel = this.scene.getObjectByName('Simbol-Avatar')
		this.scene.remove(previousModel)

		const loader = new GLTFLoader()
		loader.setDRACOLoader(new DRACOLoader())
		loader.load(url || AVATAR_URL, (model) => {
			this.avatar = model.scene
			this.avatar.name = 'Simbol-Avatar'
			this.scene.add(this.avatar)
			this.avatar.position.set(0, -0.5, 0)
			this.avatar.rotation.y = Math.PI
			this.source = url

			if (this._awaitingEditMode) {
				this.startEditMode()
			}

			if (!this.source.startsWith(AVATAR_URL) && this.editMode) {
				this.stopEditMode()
			}
		})
	}

	render() {
		this.rAF = requestAnimationFrame(this.render);
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

	stop() {
		cancelAnimationFrame(this.rAF)
	}

	destroy() {
		if (this.editMode) {
			this.stopEditMode()
		}
		window.removeEventListener('resize', this.onResize, false);
		this.stop()
		this.controls && this.controls.dispose()
		this.scene = null
		this.camera = null
		this.renderer = null
		this.raycaster = null
		this.canvas = null
		this.controls = null
		this.rAF = null
		this.source = null
		this.editMenu = null
		this.selectedMaterial = null
	}

	getSource() {
		return this.source || AVATAR_URL
	}

	_updateSource(material, color) {
		const url = new URL(this.source)
		const baseUrl = url.origin + url.pathname
		// Removes '?' and normalizes
		const oldParams = url.search.substring(1).toLowerCase()
		const paramsObject = this._createParamsObject(oldParams)
		paramsObject[material.toLowerCase()] = color.toLowerCase()
		const newParams = this._createParamsString(paramsObject)
		this.source = baseUrl + newParams
	}

	_createParamsObject(params) {
		if (!params) {
			return {}
		}
		params = decodeURIComponent(params)
		const paramsArray = params.split('&').sort()
		const paramsObject = {}
		for (const param of paramsArray) {
			const paramKeyValue = param.split('=')
			if (!paramKeyValue[0]) {
				continue
			}
			paramsObject[paramKeyValue[0]] = paramKeyValue[1]
		}
		return paramsObject
	}

	_createParamsString(paramsObject) {
		let paramsString = '?'
		for (const param of Object.entries(paramsObject)) {
			// Main use for encoding is '#'
			const key = encodeURIComponent(param[0])
			const value = encodeURIComponent(param[1])
			paramsString += `${key}=${value}&`
		}

		// Removes last '&'
		return paramsString.substring(0, paramsString.length - 1)
	}

	startEditMode() {
		if (!this.source) {
			this._awaitingEditMode = true
			return
		}
		if (!this.source.startsWith(AVATAR_URL)) {
			return
		}
		this._getIntersection = this._getIntersection.bind(this)
		this.raycaster = new THREE.Raycaster()
		this.canvas.addEventListener('click', this._getIntersection)
		this.canvas.addEventListener('touchend', this._getIntersection)
		this.editMenu = this.editMenu || this._createColorPicker()
		this.editMenu.classList.remove('hide')
		this.canvas.parentElement.appendChild(this.editMenu)
		this.editMode = true
		this._awaitingEditMode = false

		const bodyObject = this.avatar.getObjectByName('body')
		this._selectObject(bodyObject)
	}

	_getIntersection(event) {
		const mouse = new THREE.Vector2()
		const rect = event.target.getBoundingClientRect();
		const x = event.type === 'touchend' ? event.changedTouches[0].clientX - rect.left : event.offsetX
		const y = event.type === 'touchend' ? event.changedTouches[0].clientY - rect.top : event.offsetY
		mouse.x = (x / this.canvas.parentElement.clientWidth) * 2 - 1
		mouse.y = -(y / this.canvas.parentElement.clientHeight) * 2 + 1
		this.raycaster.setFromCamera(mouse, this.camera)
		const intersects = this.raycaster.intersectObject(this.avatar, true)
		if (!intersects[0]) {
			this.editMenu.classList.add('hide')
			return
		} else {
			this.editMenu.classList.remove('hide')
		}
		this._selectObject(intersects[0].object)
	}

	_selectObject(object) {
		const selectedMaterial = object.material
		this.selectedMaterial = selectedMaterial
		const materialName = this.editMenu.querySelector('.color-picker__material')
		materialName.textContent = selectedMaterial.name
		const colorCopy = new THREE.Color().copyLinearToSRGB(selectedMaterial.color)
		const colorButton = this.editMenu.querySelector(`[data-color="#${colorCopy.getHexString()}"`)
		this._unselectButtons()
		colorButton && colorButton.classList.add('color-picker__button--selected')
	}

	_createColorPicker() {
		const div = document.createElement('div')
		div.classList.add('color-picker')
		const p = document.createElement('p')
		p.classList.add('color-picker__material')
		const ul = document.createElement('ul')
		ul.classList.add('color-picker__list')
		for (const color of COLORS) {
			const li = document.createElement('li')
			li.classList.add('color-picker__item')
			const button = document.createElement('button')
			button.classList.add('color-picker__button')
			button.style['background-color'] = color
			button.dataset.color = color.toLowerCase()
			button.addEventListener('click', this._selectColor.bind(this))
			li.appendChild(button)
			ul.appendChild(li)
		}

		div.appendChild(p)
		div.appendChild(ul)
		return div
	}

	_selectColor(event) {
		if (!this.selectedMaterial) {
			return
		}
		const color = event.target.dataset.color
		this._unselectButtons()
		event.target.classList.add('color-picker__button--selected')
		this.selectedMaterial.color.set(color)
		this.selectedMaterial.color.convertSRGBToLinear()
		// this.selectedMaterial.emissive && this.selectedMaterial.emissive.set(color)
		this._updateSource(this.selectedMaterial.name, color)
	}

	_unselectButtons() {
		const buttons = this.editMenu.querySelectorAll('.color-picker__button')
			for (const button of buttons) {
			button.classList.remove('color-picker__button--selected')
		}
	}

	stopEditMode() {
		this.canvas.removeEventListener('click', this._getIntersection)
		this.canvas.removeEventListener('touchend', this._getIntersection)
		this.editMenu && this.canvas.parentElement.removeChild(this.editMenu)
		this.editMode = false
	}
}

export {AvatarCreator}
