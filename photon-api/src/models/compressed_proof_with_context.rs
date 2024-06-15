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
pub struct CompressedProofWithContext {
    #[serde(rename = "compressedProof")]
    pub compressed_proof: Box<models::CompressedProof>,
    #[serde(rename = "leafIndices")]
    pub leaf_indices: Vec<i32>,
    #[serde(rename = "leaves")]
    pub leaves: Vec<String>,
    #[serde(rename = "merkleTrees")]
    pub merkle_trees: Vec<String>,
    #[serde(rename = "rootIndices")]
    pub root_indices: Vec<i32>,
    #[serde(rename = "roots")]
    pub roots: Vec<String>,
}

impl CompressedProofWithContext {
    pub fn new(
        compressed_proof: models::CompressedProof,
        leaf_indices: Vec<i32>,
        leaves: Vec<String>,
        merkle_trees: Vec<String>,
        root_indices: Vec<i32>,
        roots: Vec<String>,
    ) -> CompressedProofWithContext {
        CompressedProofWithContext {
            compressed_proof: Box::new(compressed_proof),
            leaf_indices,
            leaves,
            merkle_trees,
            root_indices,
            roots,
        }
    }
}
