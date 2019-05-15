import {CryptoHelper} from '../utils/crypto'
import * as Utils from '../utils/utils'
import {DIDHelper} from '../did'
import {Keys} from '../keys'

const REGISTER_PARAM = 'identityRequest'
const NONCE_PARAM = 'nonce'
const AUTH_RESPONSE = 'authResponse'
const REFERRER = 'referrer'

class AppRequest {

	static getRegistrationRequest() {
		if (!document.referrer) {
			return
		}
		const urlParams = new URLSearchParams(window.location.search)
		const registerRequest = urlParams.get(REGISTER_PARAM)
		const nonce = urlParams.get(NONCE_PARAM)
		const referrer = decodeURIComponent(urlParams.get(REFERRER))
		const documentRefferer = new URL(document.referrer).origin
		console.log('generating request', registerRequest, referrer, document.referrer)
		if (registerRequest && referrer === documentRefferer) {
			console.log('generated request', registerRequest, referrer)
			return {
				registerRequest,
				nonce,
				referrer
			}
		}
	}

	static async sendAuthenticationResponse(identityRequest, session) {
		const authResponse = await AppRequest.createAccessToken(session, identityRequest.referrer, identityRequest.registerRequest)
		authResponse.nonce = identityRequest.nonce
		window.location = `${identityRequest.referrer}?${AUTH_RESPONSE}=${encodeURIComponent(JSON.stringify(authResponse))}`
	}

	static async createAccessToken(session, origin, challenge) {
		const key = await Keys.getKeyInstance(null, session)
		const signedChallenge = await CryptoHelper.sign(key, challenge)
		const accessToken = CryptoHelper.generateId()
		const didDoc = session.getDidDoc()
		const appObject = {
			origin,
			did: didDoc.id
		}
		localStorage.setItem(`apps.${accessToken}`, JSON.stringify(appObject))
		const keyId = DIDHelper.getKeyIdFromDidDoc(didDoc, key)
		return {
			challenge: Utils.toBase64(signedChallenge),
			accessToken,
			didDoc,
			key: keyId
		}
	}
}

export {AppRequest}