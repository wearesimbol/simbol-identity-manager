import * as IdentityStorage from '../storage/identity'
import {AppRequest} from './request'

const STATE_LOGGED_OUT = 0
const STATE_AUTHENTICATED = 1

const IS_AUTHED = 'isAuthed'
const REGISTER = 'register'
const AUTHENTICATE = 'authenticate'
const LOG_OUT = 'logout'
const GET_PUBLIC_PROFILE = 'getPublicProfile'

class Apps {

	constructor(session) {
		this.session = session
		this._receivedMessageHandler = this._receivedMessageHandler.bind(this)
		window.addEventListener('message', this._receivedMessageHandler, false)
	}

	init() {
		if (this.state) {
			this.sendMessage({state: STATE_AUTHENTICATED})
		} else {
			this.sendMessage({state: STATE_LOGGED_OUT})
		}
	}

	_receivedMessageHandler(event) {
		const url = new URL(document.referrer)
		if (event.origin === url.origin) {
			const data = JSON.parse(event.data)
			if (data.action) {
				switch(data.action) {
					case IS_AUTHED:
						if (!this._verifyAccessToken(event.origin, data.token)) {
							return
						}
						this.sendMessage({
							action: IS_AUTHED,
							data: this.session.isAuthed()
						})
						break
					case REGISTER:
						break
					case AUTHENTICATE:
						AppRequest.createAccessToken(this.session, event.origin, data.data.challenge)
						.then((tokenData) => {
							tokenData.nonce = data.data.nonce
							this.sendMessage({
								action: AUTHENTICATE,
								data: tokenData
							})
						})
						break
					case LOG_OUT:
						break
					case GET_PUBLIC_PROFILE:
						if (!this._verifyAccessToken(data.token, event.origin)) {
							this.sendMessage({
								action: GET_PUBLIC_PROFILE,
								data: {
									error: 'Invalid access token'
								}
							})
							return
						}
						
						const appObject = this._getAppObject(data.token)
						this.sendMessage({
							action: GET_PUBLIC_PROFILE,
							data: IdentityStorage.getPublicProfile(appObject.did)
						})
						break
					default:
						console.log('manager', data)
				}
			}
		}
	}

	_verifyAccessToken(token, origin) {
		const appObject = this._getAppObject(token)
		if (!appObject) {
			return false
		}
		return appObject.origin === origin
	}

	_getAppObject(token) {
		const appObjectString = localStorage.getItem(`apps.${token}`)
		const appObject = JSON.parse(appObjectString)
		return appObject
	}

	sendMessage(message) {
		// ToDo: after auth, use authed app url instead of referrer
		message = JSON.stringify(message)
		console.log('manager sending', message)
		window.parent.postMessage(message, document.referrer)
	}
}

export {Apps}