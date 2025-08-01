// import {
//   Connection,
//   Keypair,
//   PublicKey,
//   sendAndConfirmTransaction,
// } from "@solana/web3.js";
// import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
// import { DLMM } from "../dlmm";
// import BN from "bn.js";
// import { BinLiquidity, LbPosition, StrategyType } from "../dlmm/types";

import { BN } from "bn.js";
import { StrategyType } from "../dlmm/types";
import {
  getAmountInBinsAskSide,
  getAmountInBinsBidSide,
  getAutoFillAmountByRebalancedPosition,
} from "../dlmm/helpers/rebalance";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { DLMM } from "../dlmm";
import Decimal from "decimal.js";
import { getPriceOfBinByBinId } from "../dlmm/helpers";

// const user = Keypair.fromSecretKey(
//   new Uint8Array(bs58.decode(process.env.USER_PRIVATE_KEY))
// );
// const RPC = process.env.RPC || "https://api.devnet.solana.com";
// const connection = new Connection(RPC, "finalized");

// const poolAddress = new PublicKey(
//   "3W2HKgUa96Z69zzG3LK1g8KdcRAWzAttiLiHfYnKuPw5"
// );

// /** Utils */
// export interface ParsedClockState {
//   info: {
//     epoch: number;
//     epochStartTimestamp: number;
//     leaderScheduleEpoch: number;
//     slot: number;
//     unixTimestamp: number;
//   };
//   type: string;
//   program: string;
//   space: number;
// }

// let activeBin: BinLiquidity;
// let userPositions: LbPosition[] = [];

// const newBalancePosition = new Keypair();
// const newImbalancePosition = new Keypair();
// const newOneSidePosition = new Keypair();

// async function getActiveBin(dlmmPool: DLMM) {
//   // Get pool state
//   activeBin = await dlmmPool.getActiveBin();
//   console.log("🚀 ~ activeBin:", activeBin);
// }

// // To create a balance deposit position
// async function createBalancePosition(dlmmPool: DLMM) {
//   const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side of the active bin
//   const minBinId = activeBin.binId - TOTAL_RANGE_INTERVAL;
//   const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL;

//   const activeBinPricePerToken = dlmmPool.fromPricePerLamport(
//     Number(activeBin.price)
//   );
//   const totalXAmount = new BN(100);
//   const totalYAmount = totalXAmount.mul(new BN(Number(activeBinPricePerToken)));

//   // Create Position
//   const createPositionTx =
//     await dlmmPool.initializePositionAndAddLiquidityByStrategy({
//       positionPubKey: newBalancePosition.publicKey,
//       user: user.publicKey,
//       totalXAmount,
//       totalYAmount,
//       strategy: {
//         maxBinId,
//         minBinId,
//         strategyType: StrategyType.Spot,
//       },
//     });

//   try {
//     const createBalancePositionTxHash = await sendAndConfirmTransaction(
//       connection,
//       createPositionTx,
//       [user, newBalancePosition]
//     );
//     console.log(
//       "🚀 ~ createBalancePositionTxHash:",
//       createBalancePositionTxHash
//     );
//   } catch (error) {
//     console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
//   }
// }

// async function createImbalancePosition(dlmmPool: DLMM) {
//   const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side of the active bin
//   const minBinId = activeBin.binId - TOTAL_RANGE_INTERVAL;
//   const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL;

//   const totalXAmount = new BN(100);
//   const totalYAmount = new BN(50);

//   // Create Position
//   const createPositionTx =
//     await dlmmPool.initializePositionAndAddLiquidityByStrategy({
//       positionPubKey: newImbalancePosition.publicKey,
//       user: user.publicKey,
//       totalXAmount,
//       totalYAmount,
//       strategy: {
//         maxBinId,
//         minBinId,
//         strategyType: StrategyType.Spot,
//       },
//     });

//   try {
//     const createImbalancePositionTxHash = await sendAndConfirmTransaction(
//       connection,
//       createPositionTx,
//       [user, newImbalancePosition]
//     );
//     console.log(
//       "🚀 ~ createImbalancePositionTxHash:",
//       createImbalancePositionTxHash
//     );
//   } catch (error) {
//     console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
//   }
// }

// async function createOneSidePosition(dlmmPool: DLMM) {
//   const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side of the active bin
//   const minBinId = activeBin.binId;
//   const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL * 2;

//   const totalXAmount = new BN(100);
//   const totalYAmount = new BN(0);

//   // Create Position
//   const createPositionTx =
//     await dlmmPool.initializePositionAndAddLiquidityByStrategy({
//       positionPubKey: newOneSidePosition.publicKey,
//       user: user.publicKey,
//       totalXAmount,
//       totalYAmount,
//       strategy: {
//         maxBinId,
//         minBinId,
//         strategyType: StrategyType.Spot,
//       },
//     });

//   try {
//     const createOneSidePositionTxHash = await sendAndConfirmTransaction(
//       connection,
//       createPositionTx,
//       [user, newOneSidePosition]
//     );
//     console.log(
//       "🚀 ~ createOneSidePositionTxHash:",
//       createOneSidePositionTxHash
//     );
//   } catch (error) {
//     console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
//   }
// }

// async function getPositionsState(dlmmPool: DLMM) {
//   // Get position state
//   const positionsState = await dlmmPool.getPositionsByUserAndLbPair(
//     user.publicKey
//   );

//   userPositions = positionsState.userPositions;
//   console.log("🚀 ~ userPositions:", userPositions);
// }

// async function addLiquidityToExistingPosition(dlmmPool: DLMM) {
//   const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side of the active bin
//   const minBinId = activeBin.binId - TOTAL_RANGE_INTERVAL;
//   const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL;

//   const activeBinPricePerToken = dlmmPool.fromPricePerLamport(
//     Number(activeBin.price)
//   );
//   const totalXAmount = new BN(100);
//   const totalYAmount = totalXAmount.mul(new BN(Number(activeBinPricePerToken)));

//   // Add Liquidity to existing position
//   const addLiquidityTxs = await dlmmPool.addLiquidityByStrategy({
//     positionPubKey: newBalancePosition.publicKey,
//     user: user.publicKey,
//     totalXAmount,
//     totalYAmount,
//     strategy: {
//       maxBinId,
//       minBinId,
//       strategyType: StrategyType.Spot,
//     },
//   });

//   try {
//     await Promise.all(
//       addLiquidityTxs.map(async (addLiquidityTx) => {
//         const addLiquidityTxHash = await sendAndConfirmTransaction(
//           connection,
//           addLiquidityTx,
//           [user]
//         );
//         console.log("🚀 ~ addLiquidityTxHash:", addLiquidityTxHash);
//       })
//     );
//   } catch (error) {
//     console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
//   }
// }

// async function removePositionLiquidity(dlmmPool: DLMM) {
//   // Remove Liquidity
//   const removeLiquidityTxs = (
//     await Promise.all(
//       userPositions.map(({ publicKey, positionData }) => {
//         const binIdsToRemove = positionData.positionBinData.map(
//           (bin) => bin.binId
//         );
//         return dlmmPool.removeLiquidity({
//           position: publicKey,
//           user: user.publicKey,
//           fromBinId: binIdsToRemove[0],
//           toBinId: binIdsToRemove[binIdsToRemove.length - 1],
//           bps: new BN(100 * 100),
//           shouldClaimAndClose: true, // should claim swap fee and close position together
//         });
//       })
//     )
//   ).flat();

//   try {
//     for (let tx of removeLiquidityTxs) {
//       const removeBalanceLiquidityTxHash = await sendAndConfirmTransaction(
//         connection,
//         tx,
//         [user],
//         { skipPreflight: false, preflightCommitment: "confirmed" }
//       );
//       console.log(
//         "🚀 ~ removeBalanceLiquidityTxHash:",
//         removeBalanceLiquidityTxHash
//       );
//     }
//   } catch (error) {
//     console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
//   }
// }

// async function swap(dlmmPool: DLMM) {
//   const swapAmount = new BN(100);
//   // Swap quote
//   const swapYtoX = true;
//   const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);

//   const swapQuote = await dlmmPool.swapQuote(
//     swapAmount,
//     swapYtoX,
//     new BN(10),
//     binArrays
//   );

//   console.log("🚀 ~ swapQuote:", swapQuote);

//   const [inToken, outToken] = swapYtoX
//   ? [dlmmPool.tokenY.publicKey, dlmmPool.tokenX.publicKey]
//   : [dlmmPool.tokenX.publicKey, dlmmPool.tokenY.publicKey];

//   // Swap
//   const swapTx = await dlmmPool.swap({
//     inToken,
//     binArraysPubkey: swapQuote.binArraysPubkey,
//     inAmount: swapAmount,
//     lbPair: dlmmPool.pubkey,
//     user: user.publicKey,
//     minOutAmount: swapQuote.minOutAmount,
//     outToken,
//   });

//   try {
//     const swapTxHash = await sendAndConfirmTransaction(connection, swapTx, [
//       user,
//     ]);
//     console.log("🚀 ~ swapTxHash:", swapTxHash);
//   } catch (error) {
//     console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
//   }
// }

// async function main() {
//   const dlmmPool = await DLMM.create(connection, poolAddress, {
//     cluster: "devnet",
//   });

//   await getActiveBin(dlmmPool);
//   await createBalancePosition(dlmmPool);
//   await createImbalancePosition(dlmmPool);
//   await createOneSidePosition(dlmmPool);
//   await getPositionsState(dlmmPool);
//   await addLiquidityToExistingPosition(dlmmPool);
//   await removePositionLiquidity(dlmmPool);
//   await swap(dlmmPool);
// }

// main();

(async () => {
  const pool = new PublicKey("5JyR6thg3z9QENS8t9qt1Ktkj2fp8YQxFugS75Do45YE");
  const position = new PublicKey(
    "FeN6BgLg7n2qGqHevgcaWxTyhFwKaGXcsHpF7WEUpvvD"
  );

  const connection = new Connection(clusterApiUrl("devnet"));
  const dlmm = await DLMM.create(connection, pool);

  const parsedPosition = await dlmm.getPosition(position);
  const { rebalancePosition } =
    await dlmm.simulateRebalancePositionWithBalancedStrategy(
      position,
      parsedPosition.positionData,
      StrategyType.Spot,
      new BN(0),
      new BN(0),
      new BN(0),
      new BN(0)
    );

  const [totalAmountX, totalAmountY] = rebalancePosition.totalAmounts();
  console.log("🚀 ~ totalAmountX:", totalAmountX.toString());
  console.log("🚀 ~ totalAmountY:", totalAmountY.toString());

  const { amount, isBidSide } = getAutoFillAmountByRebalancedPosition(
    rebalancePosition,
    StrategyType.Spot
  );

  console.log("🚀 ~ amount:", amount.toString());
  console.log("🚀 ~ isBidSide:", isBidSide);
})();

// (async () => {
//   const amountY = new BN(100_000);
//   const activeBinId = new BN(1000);
//   const minDeltaId = new BN(-60);
//   const maxDeltaId = new BN(0);

//   const [y0, deltaY] = getBidParametersByStrategy(
//     StrategyType.Curve,
//     amountY,
//     minDeltaId,
//     maxDeltaId,
//     activeBinId
//   );

//   console.log(y0.toString(), deltaY.toString());

//   const amountIntoBIns = getAmountInBinsBidSide(
//     activeBinId,
//     minDeltaId,
//     maxDeltaId,
//     deltaY,
//     y0
//   );

//   console.log(amountIntoBIns.map((bin) => bin.amountY.toString()));
//   const totalAmountY = amountIntoBIns.reduce((total, { amountY }) => {
//     return total.add(amountY);
//   }, new BN(0));

//   console.log(amountY.toString(), totalAmountY.toString());
// })();

// (async () => {
//   const amountX = new BN(100_000);
//   const activeBinId = new BN(1000);
//   const minDeltaId = new BN(0);
//   const maxDeltaId = new BN(60);
//   const binStep = new BN(100);

//   const [x0, deltaX] = getAskParametersByStrategy(
//     StrategyType.Curve,
//     amountX,
//     minDeltaId,
//     maxDeltaId,
//     activeBinId,
//     binStep
//   );

//   console.log("x0", x0.toString(), "deltaX", deltaX.toString());

//   const amountIntoBIns = getAmountInBinsAskSide(
//     activeBinId,
//     binStep,
//     minDeltaId,
//     maxDeltaId,
//     deltaX,
//     x0
//   );

//   console.log(amountIntoBIns.map((bin) => bin.amountX.toString()));
//   const totalAmountX = amountIntoBIns.reduce((total, { amountX }) => {
//     return total.add(amountX);
//   }, new BN(0));

//   console.log(amountX.toString(), totalAmountX.toString());
// })();
