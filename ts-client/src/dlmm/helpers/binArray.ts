import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  MAX_BIN_ARRAY_SIZE,
  DEFAULT_BIN_PER_POSITION,
  SCALE_OFFSET,
} from "../constants";
import {
  Bin,
  BinArray,
  BinArrayAccount,
  BinArrayBitmapExtension,
  BinLiquidity,
  BitmapType,
  Clock,
  LbPair,
  RewardInfo,
  RewardInfos,
} from "../types";
import {
  EXTENSION_BINARRAY_BITMAP_SIZE,
  BIN_ARRAY_BITMAP_SIZE,
} from "../constants";
import { getPositionCount } from "./math";
import { deriveBinArray } from "./derive";

/** private */
function internalBitmapRange() {
  const lowerBinArrayIndex = BIN_ARRAY_BITMAP_SIZE.neg();
  const upperBinArrayIndex = BIN_ARRAY_BITMAP_SIZE.sub(new BN(1));
  return [lowerBinArrayIndex, upperBinArrayIndex];
}

function buildBitmapFromU64Arrays(u64Arrays: BN[], type: BitmapType) {
  const buffer = Buffer.concat(
    u64Arrays.map((b) => {
      return b.toArrayLike(Buffer, "le", 8);
    })
  );

  return new BN(buffer, "le");
}

function bitmapTypeDetail(type: BitmapType) {
  if (type == BitmapType.U1024) {
    return {
      bits: 1024,
      bytes: 1024 / 8,
    };
  } else {
    return {
      bits: 512,
      bytes: 512 / 8,
    };
  }
}

function mostSignificantBit(number: BN, bitLength: number) {
  const highestIndex = bitLength - 1;
  if (number.isZero()) {
    return null;
  }

  for (let i = highestIndex; i >= 0; i--) {
    if (number.testn(i)) {
      return highestIndex - i;
    }
  }
  return null;
}

function leastSignificantBit(number: BN, bitLength: number) {
  if (number.isZero()) {
    return null;
  }
  for (let i = 0; i < bitLength; i++) {
    if (number.testn(i)) {
      return i;
    }
  }
  return null;
}

function extensionBitmapRange() {
  return [
    BIN_ARRAY_BITMAP_SIZE.neg().mul(
      EXTENSION_BINARRAY_BITMAP_SIZE.add(new BN(1))
    ),
    BIN_ARRAY_BITMAP_SIZE.mul(
      EXTENSION_BINARRAY_BITMAP_SIZE.add(new BN(1))
    ).sub(new BN(1)),
  ];
}

function findSetBit(
  startIndex: number,
  endIndex: number,
  binArrayBitmapExtension: BinArrayBitmapExtension
): number | null {
  const getBinArrayOffset = (binArrayIndex: BN) => {
    return binArrayIndex.gt(new BN(0))
      ? binArrayIndex.mod(BIN_ARRAY_BITMAP_SIZE)
      : binArrayIndex.add(new BN(1)).neg().mod(BIN_ARRAY_BITMAP_SIZE);
  };

  const getBitmapOffset = (binArrayIndex: BN) => {
    return binArrayIndex.gt(new BN(0))
      ? binArrayIndex.div(BIN_ARRAY_BITMAP_SIZE).sub(new BN(1))
      : binArrayIndex
          .add(new BN(1))
          .neg()
          .div(BIN_ARRAY_BITMAP_SIZE)
          .sub(new BN(1));
  };

  if (startIndex <= endIndex) {
    for (let i = startIndex; i <= endIndex; i++) {
      const binArrayOffset = getBinArrayOffset(new BN(i)).toNumber();
      const bitmapOffset = getBitmapOffset(new BN(i)).toNumber();
      const bitmapChunks =
        i > 0
          ? binArrayBitmapExtension.positiveBinArrayBitmap[bitmapOffset]
          : binArrayBitmapExtension.negativeBinArrayBitmap[bitmapOffset];
      const bitmap = buildBitmapFromU64Arrays(bitmapChunks, BitmapType.U512);
      if (bitmap.testn(binArrayOffset)) {
        return i;
      }
    }
  } else {
    for (let i = startIndex; i >= endIndex; i--) {
      const binArrayOffset = getBinArrayOffset(new BN(i)).toNumber();
      const bitmapOffset = getBitmapOffset(new BN(i)).toNumber();
      const bitmapChunks =
        i > 0
          ? binArrayBitmapExtension.positiveBinArrayBitmap[bitmapOffset]
          : binArrayBitmapExtension.negativeBinArrayBitmap[bitmapOffset];
      const bitmap = buildBitmapFromU64Arrays(bitmapChunks, BitmapType.U512);
      if (bitmap.testn(binArrayOffset)) {
        return i;
      }
    }
  }

  return null;
}
/** private */

export function isOverflowDefaultBinArrayBitmap(binArrayIndex: BN) {
  const [minBinArrayIndex, maxBinArrayIndex] = internalBitmapRange();
  return (
    binArrayIndex.gt(maxBinArrayIndex) || binArrayIndex.lt(minBinArrayIndex)
  );
}

export function deriveBinArrayBitmapExtension(
  lbPair: PublicKey,
  programId: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bitmap"), lbPair.toBytes()],
    programId
  );
}

export function binIdToBinArrayIndex(binId: BN): BN {
  const { div: idx, mod } = binId.divmod(MAX_BIN_ARRAY_SIZE);
  return binId.isNeg() && !mod.isZero() ? idx.sub(new BN(1)) : idx;
}

export function getBinArrayLowerUpperBinId(binArrayIndex: BN) {
  const lowerBinId = binArrayIndex.mul(MAX_BIN_ARRAY_SIZE);
  const upperBinId = lowerBinId.add(MAX_BIN_ARRAY_SIZE).sub(new BN(1));

  return [lowerBinId, upperBinId];
}

export function isBinIdWithinBinArray(activeId: BN, binArrayIndex: BN) {
  const [lowerBinId, upperBinId] = getBinArrayLowerUpperBinId(binArrayIndex);
  return activeId.gte(lowerBinId) && activeId.lte(upperBinId);
}

export function getBinFromBinArray(binId: number, binArray: BinArray): Bin {
  const [lowerBinId, upperBinId] = getBinArrayLowerUpperBinId(binArray.index);

  let index = 0;
  if (binId > 0) {
    index = binId - lowerBinId.toNumber();
  } else {
    const delta = upperBinId.toNumber() - binId;
    index = MAX_BIN_ARRAY_SIZE.toNumber() - delta - 1;
  }

  return binArray.bins[index];
}

export function findNextBinArrayIndexWithLiquidity(
  swapForY: boolean,
  activeId: BN,
  lbPairState: LbPair,
  binArrayBitmapExtension: BinArrayBitmapExtension | null
): BN | null {
  const [lowerBinArrayIndex, upperBinArrayIndex] = internalBitmapRange();
  let startBinArrayIndex = binIdToBinArrayIndex(activeId);

  while (true) {
    if (isOverflowDefaultBinArrayBitmap(startBinArrayIndex)) {
      if (binArrayBitmapExtension === null) {
        return null;
      }
      // When bin array index is negative, the MSB is smallest bin array index.

      const [minBinArrayIndex, maxBinArrayIndex] = extensionBitmapRange();

      if (startBinArrayIndex.isNeg()) {
        if (swapForY) {
          const binArrayIndex = findSetBit(
            startBinArrayIndex.toNumber(),
            minBinArrayIndex.toNumber(),
            binArrayBitmapExtension
          );

          if (binArrayIndex !== null) {
            return new BN(binArrayIndex);
          } else {
            return null;
          }
        } else {
          const binArrayIndex = findSetBit(
            startBinArrayIndex.toNumber(),
            BIN_ARRAY_BITMAP_SIZE.neg().sub(new BN(1)).toNumber(),
            binArrayBitmapExtension
          );

          if (binArrayIndex !== null) {
            return new BN(binArrayIndex);
          } else {
            // Move to internal bitmap
            startBinArrayIndex = BIN_ARRAY_BITMAP_SIZE.neg();
          }
        }
      } else {
        if (swapForY) {
          const binArrayIndex = findSetBit(
            startBinArrayIndex.toNumber(),
            BIN_ARRAY_BITMAP_SIZE.toNumber(),
            binArrayBitmapExtension
          );

          if (binArrayIndex !== null) {
            return new BN(binArrayIndex);
          } else {
            // Move to internal bitmap
            startBinArrayIndex = BIN_ARRAY_BITMAP_SIZE.sub(new BN(1));
          }
        } else {
          const binArrayIndex = findSetBit(
            startBinArrayIndex.toNumber(),
            maxBinArrayIndex.toNumber(),
            binArrayBitmapExtension
          );

          if (binArrayIndex !== null) {
            return new BN(binArrayIndex);
          } else {
            return null;
          }
        }
      }
    } else {
      // Internal bitmap
      const bitmapType = BitmapType.U1024;
      const bitmapDetail = bitmapTypeDetail(bitmapType);
      const offset = startBinArrayIndex.add(BIN_ARRAY_BITMAP_SIZE);

      const bitmap = buildBitmapFromU64Arrays(
        lbPairState.binArrayBitmap,
        bitmapType
      );

      if (swapForY) {
        const upperBitRange = new BN(bitmapDetail.bits - 1).sub(offset);
        const croppedBitmap = bitmap.shln(upperBitRange.toNumber());

        const msb = mostSignificantBit(croppedBitmap, bitmapDetail.bits);

        if (msb !== null) {
          return startBinArrayIndex.sub(new BN(msb));
        } else {
          // Move to extension
          startBinArrayIndex = lowerBinArrayIndex.sub(new BN(1));
        }
      } else {
        const lowerBitRange = offset;
        const croppedBitmap = bitmap.shrn(lowerBitRange.toNumber());
        const lsb = leastSignificantBit(croppedBitmap, bitmapDetail.bits);
        if (lsb !== null) {
          return startBinArrayIndex.add(new BN(lsb));
        } else {
          // Move to extension
          startBinArrayIndex = upperBinArrayIndex.add(new BN(1));
        }
      }
    }
  }
}

export function findNextBinArrayWithLiquidity(
  swapForY: boolean,
  activeBinId: BN,
  lbPairState: LbPair,
  binArrayBitmapExtension: BinArrayBitmapExtension | null,
  binArrays: BinArrayAccount[]
): BinArrayAccount | null {
  const nearestBinArrayIndexWithLiquidity = findNextBinArrayIndexWithLiquidity(
    swapForY,
    activeBinId,
    lbPairState,
    binArrayBitmapExtension
  );

  if (nearestBinArrayIndexWithLiquidity == null) {
    return null;
  }

  const binArrayAccount = binArrays.find((ba) =>
    ba.account.index.eq(nearestBinArrayIndexWithLiquidity)
  );
  if (!binArrayAccount) {
    // Cached bin array couldn't cover more bins, partial quoted.
    return null;
  }

  return binArrayAccount;
}

/**
 * Retrieves the bin arrays required to initialize multiple positions in continuous range.
 *
 * @param {PublicKey} pair - The public key of the pair.
 * @param {BN} fromBinId - The starting bin ID.
 * @param {BN} toBinId - The ending bin ID.
 * @return {[{key: PublicKey, index: BN }]} An array of bin arrays required for the given position range.
 */
export function getBinArraysRequiredByPositionRange(
  pair: PublicKey,
  fromBinId: BN,
  toBinId: BN,
  programId: PublicKey
): { key: PublicKey; index: BN }[] {
  const [minBinId, maxBinId] = fromBinId.lt(toBinId)
    ? [fromBinId, toBinId]
    : [toBinId, fromBinId];

  const positionCount = getPositionCount(minBinId, maxBinId);
  const binArrays = new Map<String, BN>();

  for (let i = 0; i < positionCount.toNumber(); i++) {
    const lowerBinId = minBinId.add(DEFAULT_BIN_PER_POSITION.mul(new BN(i)));

    const lowerBinArrayIndex = binIdToBinArrayIndex(lowerBinId);
    const upperBinArrayIndex = lowerBinArrayIndex.add(new BN(1));

    const [lowerBinArray] = deriveBinArray(pair, lowerBinArrayIndex, programId);
    const [upperBinArray] = deriveBinArray(pair, upperBinArrayIndex, programId);

    binArrays.set(lowerBinArray.toBase58(), lowerBinArrayIndex);
    binArrays.set(upperBinArray.toBase58(), upperBinArrayIndex);
  }

  return Array.from(binArrays, ([key, index]) => ({
    key: new PublicKey(key),
    index,
  }));
}

export function* enumerateBins(
  binsById: Map<number, Bin>,
  lowerBinId: number,
  upperBinId: number,
  binStep: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number,
  version: number
) {
  for (
    let currentBinId = lowerBinId;
    currentBinId <= upperBinId;
    currentBinId++
  ) {
    const bin = binsById.get(currentBinId);
    if (bin != null) {
      yield BinLiquidity.fromBin(
        bin,
        currentBinId,
        binStep,
        baseTokenDecimal,
        quoteTokenDecimal,
        version
      );
    } else {
      yield BinLiquidity.empty(
        currentBinId,
        binStep,
        baseTokenDecimal,
        quoteTokenDecimal,
        version
      );
    }
  }
}

function isRewardInitialized(reward: RewardInfo) {
  return !reward.mint.equals(PublicKey.default);
}

export function getBinIdIndexInBinArray(
  binId: BN,
  lowerBinId: BN,
  upperBinId: BN
) {
  if (binId.lt(lowerBinId) || binId.gt(upperBinId)) {
    return null;
  }
  return binId.sub(lowerBinId);
}

/// Update bin array LM rewards
export function updateBinArray(
  activeId: BN,
  clock: Clock,
  allRewardInfos: RewardInfos,
  binArray: BinArray
) {
  const [lowerBinId, upperBinId] = getBinArrayLowerUpperBinId(binArray.index);
  const binIdx = getBinIdIndexInBinArray(activeId, lowerBinId, upperBinId);

  if (binIdx == null) {
    return binArray;
  }

  const binArrayClone = Object.assign({}, binArray);
  const activeBin = binArrayClone.bins[binIdx.toNumber()];

  if (activeBin.liquiditySupply.isZero()) {
    return binArrayClone;
  }

  for (const [rewardIdx, reward] of allRewardInfos.entries()) {
    if (!isRewardInitialized(reward)) {
      continue;
    }

    const currentTime = new BN(
      Math.min(
        clock.unixTimestamp.toNumber(),
        reward.rewardDurationEnd.toNumber()
      )
    );

    const delta = currentTime.sub(reward.lastUpdateTime);
    const liquiditySupply = activeBin.liquiditySupply.shrn(SCALE_OFFSET);

    const rewardPerTokenStoredDelta = reward.rewardRate
      .mul(delta)
      .div(new BN(15))
      .div(liquiditySupply);

    activeBin.rewardPerTokenStored[rewardIdx] = activeBin.rewardPerTokenStored[
      rewardIdx
    ].add(rewardPerTokenStoredDelta);
  }

  return binArrayClone;
}
