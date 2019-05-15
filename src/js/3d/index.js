import {RoomScene} from './scene'
import {THREE} from '../libs/three'
import {SimbolTHREELoader} from 'simbol/src/loaders/three.js'

class Simbol3D {

	constructor(session, canvas, vrHelper) {
		window.THREE = THREE
		this.session = session
		this.room = new RoomScene(canvas)
		this.loadAvatar()
		this.room.init()
		vrHelper.init(canvas, this.room.renderer)
	}

	async loadAvatar() {
		this.simbolLoader = new SimbolTHREELoader(THREE, this.room.scene, this.room.camera)
		const profile = this.session.getProfilePublic()
		console.log(profile)
		const avatar = await this.simbolLoader.loadAvatar(profile.avatar)
		this.room.animateFunctions.push(this.simbolLoader.update)
		console.log(avatar)
	}
}

export {Simbol3D}