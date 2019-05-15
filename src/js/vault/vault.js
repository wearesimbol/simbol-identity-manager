import {CryptoHelper} from '../utils/crypto'
import * as Utils from '../utils/utils'

const DEFAULT_TYPE = 'default'
const SUPPORTED_TYPES = ['password']
const VAULT_EMPTY = 0
const VAULT_EXISTS = 1
const VAULT_READY = 2

class Vault {

	static get supportedTypes() {
		return SUPPORTED_TYPES
	}

	constructor() {
		this.state = this.getState()

		if (this.state === 0) {
			this.createDeviceSecret()
		}
	}

	createDeviceSecret() {
		const deviceSecretBuffer = CryptoHelper.getRandomNumber()
		const deviceSecret = Utils.toBase64(deviceSecretBuffer)
		this.saveLock(DEFAULT_TYPE, deviceSecret)
		this.state = 1
	}

	async getDeviceSecret(key) {
		if (key) {
			const lock = this.getLock(key.type)
			if (!lock) {
				throw `Lock does't exist for type ${key.type}`
			}

			const decryptedLock = await key.decrypt(lock)
			return decryptedLock
		} else if (this.state === 1) {
			const lock = this.getLock(DEFAULT_TYPE)
			if (!lock) {
				throw `Lock does't exist`
			}

			return lock
		}
	}

	cleanup() {
		localStorage.removeItem(`vault.${DEFAULT_TYPE}`)
	}

	saveLock(type, lock) {
		if (!SUPPORTED_TYPES.includes(type) && type !== DEFAULT_TYPE) {
			throw 'Unsopported lock type for the Vault'
		}

		localStorage.setItem(`vault.${type}`, lock)
	}

	getLock(type) {
		if (!SUPPORTED_TYPES.includes(type) && type !== DEFAULT_TYPE) {
			throw 'Unsopported lock type for the Vault'
		}

		return localStorage.getItem(`vault.${type}`)
	}

	getState() {
		for (const type of SUPPORTED_TYPES) {
			if (this.getLock(type)) {
				return VAULT_READY
			}
		}
		
		if (this.getLock('default')) {
			return VAULT_EXISTS
		}

		return VAULT_EMPTY
	}
}

export {Vault}