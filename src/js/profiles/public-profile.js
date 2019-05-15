import {Claims} from '../claims.js'
import * as Utils from '../utils/utils.js'

const PUBLIC_PROFILE_DB_NAME = 'simbol.profile.public'

class PublicProfile {

	constructor(key) {
		this.key = key
	}
	
	static async create(did, keychain, orbitdb) {
		const key = await keychain.getKeyInstance(did)
		console.log('creating public profile', key._key, 'hey', key._publicKey)
		const pubprof = new PublicProfile(key)

		const didId = Utils.getIdFromDid(did)
		const didDocString = localStorage.getItem('did-doc.' + didId)
		const didDoc = JSON.parse(didDocString)
		pubprof.didDoc = didDoc

		// Hack to avoid https://github.com/orbitdb/orbit-db/pull/453
		const id = didId.replace('Qm', '')
		console.log(`${PUBLIC_PROFILE_DB_NAME}.${id}`)
		pubprof.db = await orbitdb.docs(`${PUBLIC_PROFILE_DB_NAME}.${id}`, {
			accessController: {
				// type: 'orbitdb',
				write: [orbitdb.identity.publicKey]
			},
			indexBy: 'claimId'
		})
		try {
			await pubprof.db.load()
			return pubprof
		} catch (e) {
			console.log(pubprof.db.identity.publicKey)
			console.warn(e)
		}
	}

	async resolve() {
		return this._generatePresentationDoc()
	}
	
	async get(claimId) {
		const claimEntry = await this.db.get(claimId)
		const claim = claimEntry[0].claim
		const isValid = Claims.verifyClaim(claim)
		if (isValid) {
			return Object.assign({}, claim.credentialSubject)
		} else {
			throw 'No valid claim saved with id: ' + claimId
		}
	}
	
	async set(claimId, claims, regeneratePresentation) {
		console.log(JSON.stringify(claims))
		const claim = await Claims.createClaim(this.didDoc, this.didDoc.id, this.key, claims)
		console.log('new claim', claim)
		await this.db.put({claimId, claim})
		if (regeneratePresentation) {
			await this._generatePresentationDoc()
		}
		return this
	}
	
	async _generatePresentationDoc() {
		const claimEntries = await this.db.query(() => true)
		const claims = claimEntries.map((claimEntry) => claimEntry.claim)
		console.log('generating presentation with: ', claimEntries, claims)
		this.presentation = await Claims.createPresentation(this.didDoc, this.key, claims)
		return this.presentation
	}

	async load() {
		const claimsDoc = this.presentation || await this.resolve()
		const publicProfileCache = {}
		for (const claim of claimsDoc.verifiableCredential) {
			const credential = Object.assign({}, claim.credentialSubject)
			delete credential.id
			for (const credentialKey of Object.keys(credential)) {
				publicProfileCache[credentialKey] = credential[credentialKey]
			}
		}
		publicProfileCache.did = this.didDoc.id
		const didId = Utils.getIdFromDid(this.didDoc.id)
		localStorage.setItem(`profile.public.${didId}`, JSON.stringify(publicProfileCache))
		return publicProfileCache
	}
}

export {PublicProfile}