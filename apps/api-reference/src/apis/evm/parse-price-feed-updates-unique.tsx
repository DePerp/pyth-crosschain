import Btc from "cryptocurrency-icons/svg/color/btc.svg";
import Eth from "cryptocurrency-icons/svg/color/eth.svg";

import {
  BTCUSD,
  ETHUSD,
  getLatestPriceUpdate,
  solidity,
  ethersJS,
  writeApi,
} from "./common";
import { ParameterType } from "../../components/EvmApi";

export const parsePriceFeedUpdatesUnique = writeApi<
  "updateData" | "priceId" | "minPublishTime" | "maxPublishTime" | "fee"
>({
  name: "parsePriceFeedUpdatesUnique",
  summary:
    "Parse `updateData` to return the **first updated** prices if the prices are published within the given time range.",
  description: `
Parse \`updateData\` and return the price feeds for the given \`priceIds\`
within, if they are all **the first updates** published between
\`minPublishTime\` and \`maxPublishTime\`.  That is to say, if \`prevPublishTime
< minPublishTime <= publishTime <= maxPublishTime\` where \`prevPublishTime\` is
the publish time of the previous update for the given price feed.  These updates
are unique per \`priceId\` and \`minPublishTime\`.  This will guarantee no
updates exist for the given \`priceIds\` earlier than the returned updates and
still in the given time range.  If you do not need the uniqueness guarantee,
consider using [parsePriceFeedUpdates](parse-price-feed-updates) instead.  Use
this function if you want to use a Pyth price for a fixed time and not the most
recent price; otherwise, consider using [updatePriceFeeds](update-price-feeds)
followed by [getPrice](get-price) or one of its variants.  Unlike
\`updatePriceFeeds\`, calling this function will not update the on-chain price.

This method requires the caller to pay a fee in wei; the required fee can be
computed by calling [getUpdateFee](get-update-fee) with \`updateData\`.

Reverts if the transferred fee is not sufficient, or \`updateData\` is invalid,
or \`updateData\` does not contain an update for any of the given \`priceIds\`
within the given time range.
  `,
  parameters: [
    {
      name: "updateData",
      type: ParameterType.HexArray,
      description: "The price update data to parse.",
    },
    {
      name: "priceId",
      type: ParameterType.HexArray,
      description: "The price ids whose feeds will be returned.",
    },
    {
      name: "minPublishTime",
      type: ParameterType.Int,
      description: "The minimum timestamp for each returned feed.",
    },
    {
      name: "maxPublishTime",
      type: ParameterType.Int,
      description: "The maximum timestamp for each returned feed.",
    },
    {
      name: "fee",
      type: ParameterType.Int,
      description:
        "The update fee in wei. This fee is sent as the value of the transaction.",
    },
  ],
  valueParam: "fee",
  examples: [
    {
      name: "Latest BTC/USD update data",
      icon: Btc,
      parameters: (ctx) => getParams(BTCUSD, ctx),
    },
    {
      name: "Latest ETH/USD update data",
      icon: Eth,
      parameters: (ctx) => getParams(ETHUSD, ctx),
    },
  ],
  code: [
    solidity(
      ({ updateData, priceId, minPublishTime, maxPublishTime, fee }) => `
bytes[] memory updateData = new bytes[](1);
updateData[0] = ${updateData ? `hex"${updateData}` : "/* <updateData> */"};

bytes32[] memory priceIds = new bytes32[](1);
priceIds[0] = ${priceId ?? "/* <priceId> */"};

uint64 minPublishTime = ${minPublishTime ?? "/* <minPublishTime> */"};
uint64 maxPublishTime = ${maxPublishTime ?? "/* <maxPublishTime> */"};

uint fee = ${fee ?? "/* <fee> */"};
pyth.parsePriceFeedUpdatesUnique{value: fee}(updateData, priceIds, minPublishTime, maxPublishTime);
    `,
    ),
    ethersJS(
      ({ updateData, priceId, minPublishTime, maxPublishTime, fee }) => `
const updateData = ${updateData ? `['${updateData}']` : "/* <updateData> */"};
const priceIds = ${priceId ? `['${priceId}']` : "/* <priceId> */"};
const minPublishTime = ethers.toBigInt(${minPublishTime ?? "/* <minPublishTime> */"});
const maxPublishTime = ethers.toBigInt(${maxPublishTime ?? "/* <maxPublishTime> */"});
const fee = ethers.toBigInt(${fee ?? "/* <fee> */"});
const tx = await contract.parsePriceFeedUpdatesUnique(updateData, priceIds, minPublishTime, maxPublishTime, {value: fee});
const receipt = await tx.wait();
    `,
    ),
  ],
});

const getParams = async (
  priceId: string,
  ctx: {
    readContract: (name: string, args: unknown[]) => Promise<unknown>;
  },
) => {
  const feed = await getLatestPriceUpdate(priceId);
  const fee = await ctx.readContract("getUpdateFee", [[feed.binary.data]]);
  if (typeof fee !== "bigint") {
    throw new TypeError("Invalid fee");
  }
  return {
    updateData: feed.binary.data,
    priceId,
    minPublishTime: (feed.parsed.price.publish_time - 5).toString(),
    maxPublishTime: (feed.parsed.price.publish_time + 5).toString(),
    fee: fee.toString(),
  };
};
