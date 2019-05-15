import {getIdFromDid} from '../utils/utils'

function getPublicProfile(did) {
	did = getIdFromDid(did)
	return JSON.parse(localStorage.getItem(`profile.public.${did}`))
}
function getDidDoc(did) {
	did = getIdFromDid(did)
	return JSON.parse(localStorage.getItem(`did-doc.${did}`))
}

export {
	getPublicProfile,
	getDidDoc
}