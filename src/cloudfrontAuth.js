import cf from "cloudfront"
import crypto from 'crypto'
// Most of the actual logic here is taken from
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_kvs_jwt_verify_section.html
const res401 = {
    statusCode: 401,
    statusDescription: "Unauthorized"
}

const ok200 = {
    statusCode: 200,
    statusDescription: "Ok"
}

async function handler(event) {
    let request = event.request

    if(request.method === "OPTIONS") {
        return ok200
    }

    if (!request.headers.authorization) {
        console.log("no auth header")
        return res401
    }

    // Parse the token
    const jwt = request.headers.authorization.value.match(/^Bearer (.+)$/i)[1]
    if (!jwt) {
        console.log("No jwt")
        return res401
    }

    const secret = await getSecret("signing-key")
    if (!secret) {
        console.log("no secret")
        return res401
    }

    try {
        const payload = jwtDecode(jwt, secret)

        // All this URI/querystring re-write will need to be done for each behavior
        // Can either duplicate this function for each behavior and define necessary behavior per-function
        // Or try to address every case where we need to bucket to the org in this function
        const uri = request.uri
        // For file retrieval, re-write path to organization's directory
        if (uri && !uri.startsWith("/upload") && !uri.startsWith("/list")) {
            request.uri = `/${payload.organization}${uri}`
        }
        // For file upload, re-write filename querystring to save to the org's directory
        if (request.querystring["filename"]) {
            request.querystring["filename"].value = `${payload.organization}/${request.querystring["filename"].value}`
        }
        // For list endpoint, set the orgId query parameter
        if (uri && uri.startsWith("/list")) {
            // Initialize orgId query parameter if it doesn't exist
            if (!request.querystring["orgId"]) {
                request.querystring["orgId"] = { value: payload.organization }
            } else {
                // Override orgId with the one from JWT to ensure security
                request.querystring["orgId"].value = payload.organization
            }
        }
    } catch (err) {
        console.log(err)
        console.log("decode failed")
        return res401
    }

    console.log(request)
    return request
}

async function getSecret(key) {
    try {
        const kvsHandle = cf.kvs()
        return await kvsHandle.get(key, { format: "string" })
    } catch (err) {
        console.log(`Failed to retrieve value for ${key}, err: ${err}`)
        return null
    }
}

function jwtDecode(token, key, noVerify) {
    // check token
    if (!token) {
        throw new Error('No token supplied')
    }
    // check segments
    const segments = token.split('.')
    if (segments.length !== 3) {
        throw new Error('Not enough or too many segments')
    }

    // All segment should be base64
    const headerSeg = segments[0]
    const payloadSeg = segments[1]
    const signatureSeg = segments[2]

    // base64 decode and parse JSON
    const payload = JSON.parse(_base64urlDecode(payloadSeg))

    if (!noVerify) {
        const signingMethod = 'sha256'
        const signingType = 'hmac'

        // Verify signature. `sign` will return base64 string.
        const signingInput = [headerSeg, payloadSeg].join('.')

        if (!_verify(signingInput, key, signingMethod, signingType, signatureSeg)) {
            throw new Error('Signature verification failed')
        }

        // Support for nbf and exp claims.
        // According to the RFC, they should be in seconds.
        if (payload.nbf && Date.now() < payload.nbf * 1000) {
            throw new Error('Token not yet active')
        }

        if (payload.exp && Date.now() > payload.exp * 1000) {
            throw new Error('Token expired')
        }
    }

    return payload
}

function _base64urlDecode(str) {
    return Buffer.from(str, 'base64url')
}

function _verify(input, key, method, type, signature) {
    if (type === "hmac") {
        return _constantTimeEquals(signature, _sign(input, key, method))
    }
    else {
        throw new Error('Algorithm type not recognized')
    }
}

//Function to ensure a constant time comparison to prevent
//timing side channels.
function _constantTimeEquals(a, b) {
    if (a.length != b.length) {
        return false
    }

    let xor = 0
    for (let i = 0; i < a.length; i++) {
        xor |= (a.charCodeAt(i) ^ b.charCodeAt(i))
    }

    return 0 === xor
}

function _sign(input, key, method) {
    return crypto.createHmac(method, key).update(input).digest('base64url')
}