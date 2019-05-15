import {WorkerQueue} from './utils/worker-queue'
import * as Utils from './utils/utils'

class Keys {
  
	constructor(keychain, session) {
		this.keychain = keychain
		this.session = session
	}
	
	async getKey(keyId = '') {
		const privKey = await this.getStoredKey(keyId)
		if (privKey) {
			console.log(privKey)
			return await this.keychain.import(keyId, privKey, this.session.getDeviceLock().password)
		} else {
			return await this.generateKey(keyId)
		}
	}
	
	async generateKey(keyId) {
		if (!keyId) throw 'You need to provide an ID for the generated key'
		const generateQueue = new WorkerQueue()
		const key = await generateQueue.postIdleTask(this.keychain.gen, this.keychain, keyId, {
			type: 'rsa',
			size: 2048
		})
		console.log(key)
		const oldKeyId = keyId
		keyId = 'did-key-' + key.id
		generateQueue.postIdleTask((previousResult, ...parameters) => {
			return this.keychain.rename(...parameters)
		}, this.keychain, oldKeyId, keyId)
		const privKey = await generateQueue.postIdleTask((previousResult, ...parameters) => {
			return this.keychain.export(...parameters)
		}, this.keychain, keyId, this.session.getDeviceLock().password)
		console.log(privKey)
		await this.saveKey(key.id, privKey)
		return key
	}
	
	async saveKey(keyId, privKey) {
		if (!localStorage.getItem('keys.' + keyId)) {
			const deviceLock = this.session.getDeviceLock()
			if (!deviceLock) {
				throw 'Lock needed to encrypt and decrypt key locally'
			}
			const encryptedKey = await deviceLock.encrypt(privKey)
			localStorage.setItem('keys.' + keyId, encryptedKey)
		}
	}
	
	async getStoredKey(id) {
		return Keys.getStoredKey(id, this.session)
	}

	static async getStoredKey(id, session) {
		const deviceLock = session.getDeviceLock()
		if (!deviceLock) {
			throw 'Lock needed to encrypt and decrypt key locally'
		}
		id = Utils.getIdFromDid(id)
		const storeId = id ? 'keys.' + id : 'session.key'
		const privKey = localStorage.getItem(storeId)
		if (privKey) {
			return await deviceLock.decrypt(privKey)
		} else {
			return
		}
	} 

	async getKeyInstance(id) {
		return Keys.getKeyInstance(id, this.session)
	}

	static async getKeyInstance(id, session) {
		const pem = await Keys.getStoredKey(id, session)
		return new Promise((resolve, reject) => {
			ipfsCrypto.keys.import(pem, session.getDeviceLock().password, (err, privKey) => {
				if (err) {
					reject(err)
				}
				resolve(privKey)
			})
		})
	}
}
	
export {Keys}