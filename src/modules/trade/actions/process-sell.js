import BigNumber from 'bignumber.js';
import { formatEther, formatShares, formatRealEther } from '../../../utils/format-number';
import { augur, abi, constants } from '../../../services/augurjs';
import { ZERO } from '../../trade/constants/numbers';
import { SUCCESS, FAILED } from '../../transactions/constants/statuses';
import { loadAccountTrades } from '../../../modules/my-positions/actions/load-account-trades';
import { updateTradeCommitLock } from '../../trade/actions/update-trade-commit-lock';
import { tradeRecursively } from '../../trade/actions/helpers/trade-recursively';
import { calculateSellTradeIDs } from '../../trade/actions/helpers/calculate-trade-ids';
import { updateExistingTransaction } from '../../transactions/actions/update-existing-transaction';
import { loadBidsAsks } from '../../bids-asks/actions/load-bids-asks';
import { addAskTransaction } from '../../transactions/actions/add-ask-transaction';
import { addShortAskTransaction } from '../../transactions/actions/add-short-ask-transaction';
import { addShortSellTransaction } from '../../transactions/actions/add-short-sell-transaction';

export function processSell(transactionID, marketID, outcomeID, numShares, limitPrice, totalEthWithFee, tradingFeesEth, gasFeesRealEth) {
	return (dispatch, getState) => {
		if (!limitPrice || !numShares) {
			return dispatch(updateExistingTransaction(transactionID, {
				status: FAILED,
				message: `invalid limit price "${limitPrice}" or shares "${numShares}"`
			}));
		}

		// we track filled eth here as well to take into account the recursiveness of trading
		let filledEth = ZERO;

		dispatch(updateExistingTransaction(transactionID, {
			status: 'starting...',
			message: `selling ${formatShares(numShares).full} for ${formatEther(totalEthWithFee).full}<br />
				paying ${formatEther(tradingFeesEth).full} in trading fees<br />
				<small>(+${formatRealEther(gasFeesRealEth).full} in estimated gas fees)</small>`
		}));

		const { loginAccount } = getState();

		tradeRecursively(marketID, outcomeID, numShares, 0, loginAccount.id, () => calculateSellTradeIDs(marketID, outcomeID, limitPrice, getState().orderBooks, loginAccount.id),
			(data) => {
				const update = { status: `${data.status} sell...` };
				if (data.hash) update.hash = data.hash;
				dispatch(updateExistingTransaction(transactionID, update));
			},
			(res) => {
				filledEth = filledEth.plus(res.filledEth);
				dispatch(updateExistingTransaction(transactionID, {
					status: 'filling...',
					message: generateMessage(numShares, res.remainingShares, filledEth)
				}));
			},
			(err, res) => {
				dispatch(updateTradeCommitLock(false));
				if (err) {
					return dispatch(updateExistingTransaction(transactionID, {
						status: FAILED,
						message: err.message
					}));
				}

				// update user's position
				dispatch(loadAccountTrades());

				filledEth = filledEth.plus(abi.bignum(res.filledEth));

				dispatch(updateExistingTransaction(transactionID, {
					status: SUCCESS,
					message: generateMessage(numShares, res.remainingShares, filledEth, res.tradingFeesEth, res.gasFeesRealEth)
				}));

				if (res.remainingShares > 0) {
					augur.getParticipantSharesPurchased(marketID, loginAccount.id, outcomeID, (sharesPurchased) => {
						const position = abi.bignum(sharesPurchased).round(2, BigNumber.ROUND_DOWN);
						console.log('sell complete! current position:', position.toString());
						const transactionData = getState().transactionsData[transactionID];
						const remainingShares = abi.bignum(res.remainingShares);
						if (position.gt(ZERO)) {
							let askShares;
							let shortAskShares;
							if (position.gt(remainingShares)) {
								if (position.minus(remainingShares).lt(constants.PRECISION.limit)) {
									askShares = position.toNumber();
								} else {
									askShares = remainingShares.round(2, BigNumber.ROUND_DOWN);
								}
								shortAskShares = 0;
							} else {
								askShares = position.toNumber();
								shortAskShares = remainingShares.minus(position).round(2, BigNumber.ROUND_DOWN).toNumber();
							}
							console.log('position:', position.toString());
							console.log('remainingShares:', remainingShares.toString());
							console.log('askShares:', askShares.toString());
							console.log('shortAskShares:', shortAskShares.toString());
							dispatch(addAskTransaction(
								transactionData.data.marketID,
								transactionData.data.outcomeID,
								transactionData.data.marketDescription,
								transactionData.data.outcomeName,
								askShares,
								limitPrice,
								totalEthWithFee,
								tradingFeesEth,
								transactionData.data.feePercent.value,
								gasFeesRealEth));
							if (shortAskShares > 0) {
								dispatch(addShortAskTransaction(
									transactionData.data.marketID,
									transactionData.data.outcomeID,
									transactionData.data.marketDescription,
									transactionData.data.outcomeName,
									shortAskShares,
									limitPrice,
									totalEthWithFee,
									tradingFeesEth,
									transactionData.data.feePercent.value,
									gasFeesRealEth));
							}
						} else {
							dispatch(loadBidsAsks(marketID, updatedOrderBook => {
								const tradeIDs = calculateSellTradeIDs(marketID, outcomeID, limitPrice, { [marketID]: updatedOrderBook }, loginAccount.id);
								console.log('new trade IDs:', tradeIDs);
								if (tradeIDs && tradeIDs.length) {
									dispatch(updateTradeCommitLock(true));
									dispatch(addShortSellTransaction(
										transactionData.data.marketID,
										transactionData.data.outcomeID,
										transactionData.data.marketDescription,
										transactionData.data.outcomeName,
										res.remainingShares,
										limitPrice,
										totalEthWithFee,
										tradingFeesEth,
										transactionData.data.feePercent.value,
										gasFeesRealEth));
								} else {
									dispatch(addShortAskTransaction(
										transactionData.data.marketID,
										transactionData.data.outcomeID,
										transactionData.data.marketDescription,
										transactionData.data.outcomeName,
										res.remainingShares,
										limitPrice,
										totalEthWithFee,
										tradingFeesEth,
										transactionData.data.feePercent.value,
										gasFeesRealEth));
								}
							}));
						}
					});
				}
			}
		);
	};
}

function generateMessage(numShares, remainingShares, filledEth, tradingFeesEth, gasFeesRealEth) {
	const filledShares = abi.bignum(numShares).minus(abi.bignum(remainingShares));
	return `sold ${formatShares(filledShares).full} for ${formatEther(filledEth).full}<br />
		paid ${formatEther(tradingFeesEth).full} in trading fees<br />
		<small>(+${formatRealEther(gasFeesRealEth).full} in gas fees)</small>`;
}
