import { S3, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3({ region: "us-west-2" })

export const handler = async (event: any) => {
    const filename = event.queryStringParameters?.filename
    const contentType = event.queryStringParameters?.contentType || "application/octet-stream";

    if(!filename) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing 'filename' query parameter"})
        }
    }

    const putCommand = new PutObjectCommand({
        Bucket: process.env.ASSETS_BUCKET,
        Key: filename,
        ContentType: contentType
    });

    const url = await getSignedUrl(s3, putCommand, { expiresIn: 3600 })

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url })
    }
}