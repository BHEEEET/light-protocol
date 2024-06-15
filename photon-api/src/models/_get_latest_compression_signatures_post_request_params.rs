/*
 * photon-indexer
 *
 * Solana indexer for general compression
 *
 * The version of the OpenAPI document: 0.23.0
 *
 * Generated by: https://openapi-generator.tech
 */

use crate::models;

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
pub struct GetLatestCompressionSignaturesPostRequestParams {
    #[serde(
        rename = "cursor",
        default,
        with = "::serde_with::rust::double_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cursor: Option<Option<String>>,
    #[serde(
        rename = "limit",
        default,
        with = "::serde_with::rust::double_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub limit: Option<Option<i32>>,
}

impl GetLatestCompressionSignaturesPostRequestParams {
    pub fn new() -> GetLatestCompressionSignaturesPostRequestParams {
        GetLatestCompressionSignaturesPostRequestParams {
            cursor: None,
            limit: None,
        }
    }
}
