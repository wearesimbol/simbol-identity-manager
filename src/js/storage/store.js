import * as Utils from '../utils/utils'

class Store {

	static saveIncompleteIdentity(id) {
		const idsList = localStorage.getItem('incomplete')
		const savedIdentities = idsList ? idsList.split(',') : []
		if (!savedIdentities.includes(id)) {
			savedIdentities.push(id)
			localStorage.setItem('incomplete', savedIdentities.join())
		}
	}

	static async cleanUpRegistration(ipfs) {
		const incompleteIdsString = localStorage.getItem('incomplete')
		if (!incompleteIdsString) {
			return
		}
		const incompleteIds = incompleteIdsString.split(',')
		const incompleteIdsCopy = [...incompleteIds]
		for (const id of incompleteIdsCopy) {
			localStorage.removeItem('keys.' + id)
			localStorage.removeItem('did-doc.' + id)
			localStorage.removeItem('profile.public.' + id)
			try {
				await ipfs.key.rm('did-key-' + id)
			} catch {}
			const index = incompleteIds.indexOf(id)
			incompleteIds.splice(index, 1)
		}
		localStorage.setItem('incomplete', incompleteIds.join(','))
	}

	static saveCompleteIdentity(id) {
		id = Utils.getIdFromDid(id)
		const didsList = localStorage.getItem('dids')
		const savedIdentities = didsList ? didsList.split(',') : []
		if (!savedIdentities.includes(id)) {
			savedIdentities.push(id)
			localStorage.setItem('dids', savedIdentities.join())
		}

		const incompleteIdsString = localStorage.getItem('incomplete')
		if (incompleteIdsString) {
			const incompleteIds = incompleteIdsString.split(',')
			const index = incompleteIds.indexOf(id)
			incompleteIds.splice(index, 1)
			localStorage.setItem('incomplete', incompleteIds.join(','))
		}
	}

	static async deleteIdentity(id) {
		id = Utils.getIdFromDid(id)
		localStorage.removeItem('keys.' + id)
		localStorage.removeItem('did-doc.' + id)
		localStorage.removeItem('profile.public.' + id)
		try {
			await ipfs.key.rm('did-key-' + id)
		} catch {}

		const didsList = localStorage.getItem('dids')
		const savedIdentities = didsList ? didsList.split(',') : []
		const index = savedIdentities.indexOf(id)
		savedIdentities.splice(index, 1)
		localStorage.setItem('dids', savedIdentities.join(','))
	}
}

export {Store}