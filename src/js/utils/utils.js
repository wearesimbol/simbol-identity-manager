import {getDidDoc} from '../storage/identity'
import {IpfsHelper} from './ipfs'

async function resolveDidDoc(did, local) {
	if (!did.startsWith('did:ipid')) {
		throw 'Incorrect DID'
	}
	const hash = getIdFromDid(did)
	if (local) {
		const fileJson = getDidDoc(hash)
		return fileJson
	} else {
		const fileHash = await IpfsHelper.ipfs.name.resolve(hash)
		const rawFile = await IpfsHelper.ipfs.files.cat(fileHash.path)
		const fileJson = JSON.parse(rawFile.toString('utf8'))
		return fileJson
	}
}

function getIdFromDid(did) {
	if (!did) {
		return null
	}
	return did.replace('did:ipid:', '')
}  

// https://stackoverflow.com/a/36046727/559947
function toBase64(u8) {
	return btoa(String.fromCharCode.apply(null, u8))
}

function fromBase64(str) {
	return Uint8Array.from(atob(str).split('').map((c) => {
		return c.charCodeAt(0)
	}))
}

function stringToBuffer(str) {
	const encoder = new TextEncoder()
	return encoder.encode(str)
}

function sortObjectProperties(object) {
	return Object
		.entries(object)
		.sort()
		.reduce((_sortedObj, [k,v]) => ({
			..._sortedObj, 
			[k]: v
		}), {})
}

export {
	resolveDidDoc,
	getIdFromDid,
	toBase64,
	fromBase64,
	stringToBuffer,
	sortObjectProperties
}