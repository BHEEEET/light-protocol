import {
  ProviderErrorCode,
  TransactionError,
  TransactionErrorCode,
} from "../errors";
import {
  Account,
  Provider,
  IDL_LIGHT_MERKLE_TREE_PROGRAM,
  checkRentExemption,
  Utxo,
  FIELD_SIZE,
  Action,
  merkleTreeProgramId,
  fetchRecentTransactions,
  MerkleTreeConfig,
  lightAccounts,
  Transaction,
  ShieldTransaction,
  UnshieldTransaction,
  TestRelayer,
} from "../index";
import { BN, Program } from "@coral-xyz/anchor";
import { getAccount } from "@solana/spl-token";
const assert = require("assert");
export class TestTransaction {
  testValues?: {
    recipientBalancePriorTx?: BN;
    relayerRecipientAccountBalancePriorLastTx?: BN;
    txIntegrityHash?: BN;
    senderFeeBalancePriorTx?: BN;
    recipientFeeBalancePriorTx?: BN;
    is_token?: boolean;
  };
  accounts: lightAccounts;
  provider: Provider;
  merkleTreeProgram?: Program<typeof IDL_LIGHT_MERKLE_TREE_PROGRAM>;
  appParams?: any;
  action: Action;
  transaction: Transaction;

  constructor({
    accounts,
    transaction,
    provider,
    appParams,
  }: {
    transaction: ShieldTransaction | UnshieldTransaction | Transaction;
    accounts: lightAccounts;
    appParams?: any;
    provider: Provider;
  }) {
    this.merkleTreeProgram = new Program(
      IDL_LIGHT_MERKLE_TREE_PROGRAM,
      merkleTreeProgramId,
      provider.provider,
    );
    this.accounts = accounts;
    this.provider = provider;
    this.appParams = appParams;
    this.testValues = {};
    this.action = transaction["action"]
      ? transaction["action"]
      : Action.TRANSFER;
    this.transaction = transaction;
  }

  // send transaction should be the same for both shiel and unshield
  // the function should just send the tx to the rpc or relayer respectively
  // in case there is more than one transaction to be sent to the verifier these can be sent separately
  // TODO: make optional and default no
  async getTestValues() {
    if (!this.testValues)
      throw new TransactionError(
        TransactionErrorCode.TRANSACTION_INPUTS_UNDEFINED,
        "getTestValues",
        "",
      );

    if (this.accounts.recipientSpl) {
      try {
        this.testValues.recipientBalancePriorTx = new BN(
          (
            await getAccount(
              this.provider.provider.connection,
              this.accounts.recipientSpl,
            )
          ).amount.toString(),
        );
      } catch (e) {
        // covers the case of the recipient being a native sol address not a spl token address
        try {
          this.testValues.recipientBalancePriorTx = new BN(
            await this.provider.provider.connection.getBalance(
              this.accounts.recipientSpl,
            ),
          );
        } catch (_) {
          /* empty */
        }
      }
    }

    this.testValues.recipientFeeBalancePriorTx = new BN(
      await this.provider.provider.connection.getBalance(
        this.accounts.recipientSol,
      ),
    );
    if (this.action === "SHIELD") {
      this.testValues.senderFeeBalancePriorTx = new BN(
        await this.provider.provider.connection.getBalance(
          this.accounts.signingAddress,
        ),
      );
    } else {
      this.testValues.senderFeeBalancePriorTx = new BN(
        await this.provider.provider.connection.getBalance(
          this.accounts.senderSol,
        ),
      );
    }

    this.testValues.relayerRecipientAccountBalancePriorLastTx = new BN(
      await this.provider.provider.connection.getBalance(
        this.accounts.relayerRecipientSol,
      ),
    );
  }

  async checkBalances(
    transactionInputs: any,
    remainingAccounts: any,
    proofInput: any,
    account?: Account,
  ) {
    if (!transactionInputs.publicInputs)
      throw new TransactionError(
        TransactionErrorCode.PUBLIC_INPUTS_UNDEFINED,
        "getPdaAddresses",
        "",
      );

    if (!this.accounts.senderSol) {
      throw new Error("accounts.senderSol undefined");
    }

    if (!this.accounts.recipientSol) {
      throw new Error("accounts.recipientSol undefined");
    }

    if (!this.testValues) {
      throw new Error("test values undefined");
    }
    if (!this.testValues.senderFeeBalancePriorTx) {
      throw new Error("senderFeeBalancePriorTx undefined");
    }

    if (!this.merkleTreeProgram) {
      throw new Error("merkleTreeProgram undefined");
    }

    if (!this.provider) {
      throw new Error("provider undefined");
    }

    if (!remainingAccounts) {
      throw new Error("remainingAccounts.nullifierPdaPubkeys undefined");
    }
    if (!remainingAccounts.nullifierPdaPubkeys) {
      throw new Error("remainingAccounts.nullifierPdaPubkeys undefined");
    }

    if (!remainingAccounts.leavesPdaPubkeys) {
      throw new Error("remainingAccounts.leavesPdaPubkeys undefined");
    }
    if (!this.testValues) {
      throw new Error("test values undefined");
    }
    if (!this.testValues.recipientFeeBalancePriorTx) {
      throw new Error("test values recipientFeeBalancePriorTx undefined");
    }

    if (!this.testValues.relayerRecipientAccountBalancePriorLastTx) {
      throw new Error(
        "test values relayerRecipientAccountBalancePriorLastTx undefined",
      );
    }

    this.testValues.is_token =
      new BN(proofInput.publicAmountSpl).toString() !== "0";
    if (this.testValues.is_token && !this.accounts.senderSpl) {
      throw new Error("accounts.senderSpl undefined");
    }
    if (this.testValues.is_token && !this.accounts.recipientSpl) {
      throw new Error("accounts.recipientSpl undefined");
    }
    if (this.testValues.is_token && !this.testValues.recipientBalancePriorTx) {
      throw new Error("test values recipientBalancePriorTx undefined");
    }

    // Checking that nullifiers were inserted
    for (let i = 0; i < remainingAccounts.nullifierPdaPubkeys?.length; i++) {
      const nullifierAccount =
        await this.provider.provider!.connection.getAccountInfo(
          remainingAccounts.nullifierPdaPubkeys[i].pubkey,
          {
            commitment: "processed",
          },
        );

      await checkRentExemption({
        account: nullifierAccount,
        connection: this.provider.provider!.connection,
      });
    }

    let nrInstructions;
    if (this.appParams) {
      nrInstructions = 2;
    } else if (this.transaction) {
      nrInstructions = this.transaction.private.inputUtxos.length === 2 ? 1 : 2;
      if (this.transaction.public.message) {
        nrInstructions =
          Math.ceil(this.transaction.public.message.length / 900) + 1;
      }
    } else {
      throw new Error("No params provided.");
    }

    if (this.action == "SHIELD" && !this.testValues.is_token) {
      const recipientSolAccountBalance =
        await this.provider.provider.connection.getBalance(
          this.accounts.recipientSol,
          "confirmed",
        );

      const senderFeeAccountBalance =
        await this.provider.provider.connection.getBalance(
          this.accounts.signingAddress,
          "confirmed",
        );
      assert.equal(
        recipientSolAccountBalance,
        Number(this.testValues.recipientFeeBalancePriorTx) +
          Number(this.transaction.public.publicAmountSol),
      );

      assert.equal(
        new BN(this.testValues.senderFeeBalancePriorTx)
          .sub(this.transaction.public.publicAmountSol)
          .sub(new BN(5000 * nrInstructions))
          .toString(),
        senderFeeAccountBalance.toString(),
      );
    } else if (this.action == "SHIELD" && this.testValues.is_token) {
      const recipientAccount = await getAccount(
        this.provider.provider.connection,
        this.accounts.recipientSpl!,
      );
      const recipientSolAccountBalance =
        await this.provider.provider.connection.getBalance(
          this.accounts.recipientSol,
        );
      assert.equal(
        recipientAccount.amount.toString(),
        (
          Number(this.testValues.recipientBalancePriorTx) +
          Number(this.transaction.public.publicAmountSpl)
        ).toString(),
        "amount not transferred correctly",
      );
      if (!this.accounts.signingAddress)
        throw new Error("Signing address undefined");
      const senderFeeAccountBalance =
        await this.provider.provider.connection.getBalance(
          this.accounts.signingAddress,
          "confirmed",
        );
      assert.equal(
        recipientSolAccountBalance,
        Number(this.testValues.recipientFeeBalancePriorTx) +
          Number(this.transaction.public.publicAmountSol),
      );

      assert.equal(
        new BN(this.testValues.senderFeeBalancePriorTx)
          .sub(this.transaction.public.publicAmountSol)
          .sub(new BN(5000 * nrInstructions))
          .toString(),
        senderFeeAccountBalance.toString(),
      );
    } else if (this.action == "UNSHIELD" && !this.testValues.is_token) {
      const relayerAccount = await this.provider.provider.connection.getBalance(
        this.accounts.relayerRecipientSol,
        "confirmed",
      );

      const recipientFeeAccount =
        await this.provider.provider.connection.getBalance(
          this.accounts.recipientSol,
          "confirmed",
        );

      assert.equal(
        new BN(recipientFeeAccount)
          .add(this.transaction.public.relayerFee)
          .toString(),
        new BN(this.testValues.recipientFeeBalancePriorTx)
          .sub(
            this.transaction.public.publicAmountSol
              ?.sub(FIELD_SIZE)
              .mod(FIELD_SIZE),
          )
          .toString(),
      );
      assert.equal(
        new BN(relayerAccount)
          .sub(this.transaction.public.relayerFee)
          .toString(),
        this.testValues.relayerRecipientAccountBalancePriorLastTx?.toString(),
      );
    } else if (this.action == "UNSHIELD" && this.testValues.is_token) {
      await getAccount(
        this.provider.provider.connection,
        this.accounts.senderSpl!,
      );

      const recipientAccount = await getAccount(
        this.provider.provider.connection,
        this.accounts.recipientSpl!,
      );

      assert.equal(
        recipientAccount.amount.toString(),
        new BN(this.testValues.recipientBalancePriorTx!)
          .sub(
            this.transaction.public.publicAmountSpl
              ?.sub(FIELD_SIZE)
              .mod(FIELD_SIZE),
          )
          .toString(),
        "amount not transferred correctly",
      );

      const relayerAccount = await this.provider.provider.connection.getBalance(
        this.accounts.relayerRecipientSol,
        "confirmed",
      );

      const recipientFeeAccount =
        await this.provider.provider.connection.getBalance(
          this.accounts.recipientSol,
          "confirmed",
        );

      assert.equal(
        new BN(recipientFeeAccount)
          .add(this.transaction.public.relayerFee)
          .toString(),
        new BN(this.testValues.recipientFeeBalancePriorTx)
          .sub(
            this.transaction.public.publicAmountSol
              ?.sub(FIELD_SIZE)
              .mod(FIELD_SIZE),
          )
          .toString(),
      );

      assert.equal(
        new BN(relayerAccount)
          .sub(this.transaction.public.relayerFee)
          // .add(new BN("5000"))
          .toString(),
        this.testValues.relayerRecipientAccountBalancePriorLastTx?.toString(),
      );
    } else if (this.action === Action.TRANSFER) {
      console.log("balance check for transfer not implemented");
    } else {
      throw Error("mode not supplied");
    }

    if (this.transaction.public.message) {
      const { transactions: indexedTransactions } =
        await fetchRecentTransactions({
          connection: this.provider!.provider!.connection,
          batchOptions: {
            limit: 5000,
          },
        });
      indexedTransactions.sort(
        (a, b) => b.transaction.blockTime - a.transaction.blockTime,
      );
      assert.equal(
        indexedTransactions[0].transaction.message.toString(),
        this.transaction.public.message.toString(),
      );
    }
  }

  /**
   * Checks whether the output commitment was actually inserted to the Merkle
   * tree.
   */
  async checkMerkleTreeLeaves(transactionInputs: any) {
    // using any because TestRelayer has solMerkleTree property but Relayer doesn't
    const relayer = this.provider.relayer as any;
    for (let i = 0; i < 2; i++) {
      assert.deepEqual(
        new BN(
          relayer.solMerkleTree!.merkleTree.elements()[
            relayer.solMerkleTree!.merkleTree.indexOf(
              this.transaction.private.outputUtxos[0].getCommitment(
                this.provider.hasher,
              ),
            )
          ],
        )
          .toArray("be", 32)
          .toString(),
        transactionInputs.publicInputs.outputCommitment[0].toString(),
      );
    }
  }
}
