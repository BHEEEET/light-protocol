use clap::Parser;
use forester::cli::{Cli, Commands};
use forester::errors::ForesterError;
use forester::metrics::{push_metrics, register_metrics};
use forester::photon_indexer::PhotonIndexer;
use forester::telemetry::setup_telemetry;
use forester::tree_data_sync::fetch_trees;
use forester::{init_config, run_pipeline, run_queue_info};
use forester_utils::forester_epoch::TreeType;
use forester_utils::rpc::{RpcConnection, SolanaRpcConnection};
use log::{debug, info, warn};
use std::sync::Arc;
use tokio::signal::ctrl_c;
use tokio::sync::{mpsc, oneshot};

#[tokio::main]
async fn main() -> Result<(), ForesterError> {
    setup_telemetry();
    register_metrics();

    let config = match init_config() {
        Ok(config) => Arc::new(config),
        Err(e) => {
            panic!("Failed to initialize config: {}", e);
        }
    };

    let cli = Cli::parse();

    match &cli.command {
        Some(Commands::Start) => {
            let (shutdown_sender, shutdown_receiver) = oneshot::channel();
            let (work_report_sender, mut work_report_receiver) = mpsc::channel(100);

            tokio::spawn(async move {
                ctrl_c().await.expect("Failed to listen for Ctrl+C");
                shutdown_sender
                    .send(())
                    .expect("Failed to send shutdown signal");
            });

            tokio::spawn(async move {
                while let Some(report) = work_report_receiver.recv().await {
                    debug!("Work Report: {:?}", report);
                }
            });
            let indexer_rpc =
                SolanaRpcConnection::new(config.external_services.rpc_url.to_string(), None);
            let indexer = Arc::new(tokio::sync::Mutex::new(PhotonIndexer::new(
                config.external_services.indexer_url.to_string(),
                config.external_services.photon_api_key.clone(),
                indexer_rpc,
            )));

            run_pipeline(config, indexer, shutdown_receiver, work_report_sender).await?
        }
        Some(Commands::Status) => {
            info!("Fetching trees...");
            info!("RPC URL: {}", config.external_services.rpc_url);
            let rpc = SolanaRpcConnection::new(config.external_services.rpc_url.to_string(), None);
            let trees = fetch_trees(&rpc).await;
            if trees.is_empty() {
                warn!("No trees found. Exiting.");
            }
            run_queue_info(config.clone(), trees.clone(), TreeType::State).await;
            run_queue_info(config.clone(), trees.clone(), TreeType::Address).await;

            if let Err(e) = push_metrics(&config.external_services.pushgateway_url).await {
                warn!("Failed to push metrics: {:?}", e);
            }
        }
        None => {}
    }
    Ok(())
}
