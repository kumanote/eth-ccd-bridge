fn main() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(feature = "generate-client")]
    {
        ethers::prelude::Abigen::new("BridgeManager", "abis/root-chain-manager.json")?
            .generate()?
            .write_to_file(format!("src/root_chain_manager.rs"))?;

        ethers::prelude::Abigen::new("StateSender", "abis/state-sender.json")?
            .generate()?
            .write_to_file(format!("src/state_sender.rs"))?;

        ethers::prelude::Abigen::new("Erc20", "abis/erc20.json")?
            .generate()?
            .write_to_file(format!("src/erc20.rs"))?;
    }
    Ok(())
}
