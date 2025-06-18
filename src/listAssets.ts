import { S3, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3({ region: "us-west-2" });

export const handler = async (event: any) => {
    try {
        const orgId = event.queryStringParameters?.orgId;
        
        if (!orgId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing 'orgId' query parameter" })
            };
        }
        
        // List objects with the org prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.ASSETS_BUCKET as string,
            Prefix: `${orgId}/`,
            MaxKeys: 1000
        });
        
        const response = await s3.send(listCommand);
        
        // Remove the org prefix from the keys
        const assets = response.Contents?.map(item => {
            // Remove the org prefix (e.g., "orgId/") from the key
            const originalKey = item.Key || "";
            const keyWithoutPrefix = originalKey.startsWith(`${orgId}/`) 
                ? originalKey.substring(orgId.length + 1) // +1 for the slash
                : originalKey;
                
            return {
                key: keyWithoutPrefix,
                size: item.Size,
                lastModified: item.LastModified,
                etag: item.ETag
            };
        }) || [];
        
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ assets })
        };
    } catch (error) {
        console.error('Error listing assets:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to list assets" })
        };
    }
} 