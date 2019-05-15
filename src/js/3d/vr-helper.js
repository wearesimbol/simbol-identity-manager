class VRHelper {

	init(canvas, renderer) {
		this.canvas = canvas
		this.renderer = renderer
		window.addEventListener('vrdisplayactivate', (event) => {
			this.renderer.vr.setDevice(event.display)
			event.display.requestPresent([{source: this.canvas}])
		}, false)
	}

	async startSession() {
		try {
			const displays = await navigator.getVRDisplays()
			if (displays.length > 0) {
				this.renderer.vr.setDevice(displays[0])
				displays[0].requestPresent([{ source: this.canvas}])
				return true
			}
			else {
				this.showVRNotFound()
				throw 'No VR devices connected'
			}
		}
		catch (e) {
			this.showVRNotFound()
			throw 'No VR devices connected'
		}
	}

	isVRReady() {
		if (navigator.getVRDisplays) {
			return true
		} else {
			return false
		}
	}

	showVRNotFound() {
		if (!this.vrErrorMessage) {
			this.vrErrorMessage = document.body.querySelector('.page-error')
			const closeEl = this.vrErrorMessage.querySelector('.page-error__close')
			closeEl.addEventListener('click', () => {
				this.vrErrorMessage.classList.add('hide')
			})
		}

		this.vrErrorMessage.classList.remove('hide')
		setTimeout(() => {
			this.vrErrorMessage.classList.add('hide')
		}, 3000)
	}
}

export {VRHelper}