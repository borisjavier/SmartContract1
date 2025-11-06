"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
var escrowcontract_1 = require("./src/contracts/escrowcontract");
var scrypt_ts_1 = require("scrypt-ts");
var gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
var dotenv = require("dotenv");
// Load the .env file
dotenv.config();
function getConfirmedUtxos(utxos) {
  return utxos.filter(function (utxo) {
    return utxo.height >= 0;
  });
}
var woc_api_key = process.env.WOC_API_KEY;
var provider = new gn_provider_1.GNProvider(
  scrypt_ts_1.bsv.Networks.mainnet,
  woc_api_key
);
var privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(
  process.env.PRIVATE_KEY || ""
);
/*function sanitizePrivateKey(key: string | undefined): bsv.PrivateKey {
    if (!key) throw new Error("Private key is undefined")
    const cleanKey = key.replace(/["';\\\s]/g, '')
    try {
        return bsv.PrivateKey.fromWIF(cleanKey)
    } catch (error) {
        throw new Error(`Invalid private key format: ${cleanKey.substring(0, 6)}...`)
    }
}*/
function main(txId, participantKeys, atOutputIndex) {
  if (atOutputIndex === void 0) {
    atOutputIndex = 0;
  }
  return __awaiter(this, void 0, void 0, function () {
    var callWithRetry;
    var _this = this;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [4 /*yield*/, escrowcontract_1.Escrowcontract.loadArtifact()];
        case 1:
          _a.sent();
          callWithRetry = function (attempt, delay) {
            if (attempt === void 0) {
              attempt = 1;
            }
            if (delay === void 0) {
              delay = 3000;
            }
            return __awaiter(_this, void 0, void 0, function () {
              var maxAttempts, _loop_1, attemptCount, state_1;
              return __generator(this, function (_a) {
                switch (_a.label) {
                  case 0:
                    maxAttempts = 4;
                    _loop_1 = function (attemptCount) {
                      var txResponse,
                        instance,
                        participantPrivateKeys,
                        allPrivateKeys,
                        publicKeys_1,
                        address,
                        allUtxos,
                        confirmedUtxos,
                        signer,
                        unlockTx,
                        error_1;
                      return __generator(this, function (_b) {
                        switch (_b.label) {
                          case 0:
                            _b.trys.push([0, 5, , 9]);
                            return [4 /*yield*/, provider.getTransaction(txId)];
                          case 1:
                            txResponse = _b.sent();
                            instance = escrowcontract_1.Escrowcontract.fromTx(
                              txResponse,
                              atOutputIndex
                            );
                            //const privateKey = sanitizePrivateKey(privateKey);
                            if (!privateKey) {
                              throw new Error(
                                "Deployer key "
                                  .concat(privateKey, " not found in .env ")
                                  .concat(atOutputIndex)
                              );
                            }
                            participantPrivateKeys = participantKeys.map(
                              function (wif) {
                                try {
                                  return scrypt_ts_1.bsv.PrivateKey.fromWIF(
                                    wif
                                  );
                                } catch (error) {
                                  throw new Error(
                                    "Invalid participant key: ".concat(
                                      wif.substring(0, 6),
                                      "..."
                                    )
                                  );
                                }
                              }
                            );
                            allPrivateKeys = __spreadArray(
                              [privateKey],
                              participantPrivateKeys,
                              true
                            );
                            publicKeys_1 = allPrivateKeys.map(function (pk) {
                              return pk.publicKey;
                            });
                            address = privateKey.toAddress();
                            return [4 /*yield*/, provider.listUnspent(address)];
                          case 2:
                            allUtxos = _b.sent();
                            confirmedUtxos = getConfirmedUtxos(allUtxos);
                            signer = new scrypt_ts_1.TestWallet(
                              allPrivateKeys,
                              provider
                            );
                            if (confirmedUtxos.length === 0) {
                              throw new Error(
                                "No hay UTXOs confirmados disponibles para el despliegue"
                              );
                            }
                            return [4 /*yield*/, instance.connect(signer)];
                          case 3:
                            _b.sent();
                            return [
                              4 /*yield*/,
                              instance.methods.pay(
                                function (sigResps) {
                                  return (0, scrypt_ts_1.findSigs)(
                                    sigResps,
                                    publicKeys_1
                                  );
                                },
                                publicKeys_1.map(function (publicKey) {
                                  return (0,
                                  scrypt_ts_1.PubKey)(publicKey.toByteString());
                                }),
                                {
                                  pubKeyOrAddrToSign: publicKeys_1,
                                }
                              ),
                            ];
                          case 4:
                            unlockTx = _b.sent().tx;
                            //console.log('Contract unlocked, transaction ID:', unlockTx.id);
                            console.log(
                              "✅ Contract unlocked successfully: ",
                              unlockTx.id
                            );
                            return [
                              2 /*return*/,
                              {
                                value: {
                                  txId: unlockTx.id,
                                },
                              },
                            ];
                          case 5:
                            error_1 = _b.sent();
                            if (error_1 instanceof Error) {
                              console.error(
                                "Attempt "
                                  .concat(attempt, " failed: ")
                                  .concat(error_1.message)
                              );
                              if (
                                error_1.message.includes("500") &&
                                error_1.message.includes("txn-mempool-conflict")
                              ) {
                                console.log(
                                  "Mempool conflict detected. Retrying in ".concat(
                                    delay,
                                    "ms..."
                                  )
                                );
                              }
                            } else {
                              console.error(
                                "Attempt ".concat(
                                  attempt,
                                  " failed with unknown error:"
                                ),
                                error_1
                              );
                            }
                            console.error(
                              "Attempt ".concat(attempt, " failed.")
                            );
                            if (!(attempt < maxAttempts - 1))
                              return [3 /*break*/, 7];
                            return [
                              4 /*yield*/,
                              new Promise(function (resolve) {
                                return setTimeout(resolve, delay);
                              }),
                            ];
                          case 6:
                            _b.sent();
                            delay *= 2;
                            return [3 /*break*/, 8];
                          case 7:
                            // CORRECCIÓN: Lanzar error después de agotar todos los intentos
                            throw new Error(
                              "All ".concat(
                                maxAttempts,
                                " call attempts failed"
                              )
                            );
                          case 8:
                            return [3 /*break*/, 9];
                          case 9:
                            return [2 /*return*/];
                        }
                      });
                    };
                    attemptCount = attempt;
                    _a.label = 1;
                  case 1:
                    if (!(attemptCount <= maxAttempts)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attemptCount)];
                  case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                      return [2 /*return*/, state_1.value];
                    _a.label = 3;
                  case 3:
                    attemptCount++;
                    return [3 /*break*/, 1];
                  case 4:
                    // Esta línea nunca debería ejecutarse, pero TypeScript necesita ver un return
                    throw new Error("Unexpected execution path");
                }
              });
            });
          };
          return [2 /*return*/, callWithRetry()];
      }
    });
  });
}
var participantKeys = [
  "KxgAsLj2Db5wanVL9bahW7ETAWm9ujyYouGxyR1p4MDPxpVvf6tY",
  "KxWDwzqrHSoM6N2VeFJZHXS54enbY1EgRpcRrR5BwKPBNLXGZLJm",
  "L1jeCD1urUGLhK5EMv4zxwei2BaQJpQhWikAcP3m5ZWz6oDHdSyX",
  "Kz3EyUNUNisjjXcKfNkRyvKFViM2tKrQzbE8qoXmmskJ2jawe5M8",
]; //OJO AQUÍ, NUMERO DE FIRMAS INSUFICIENTE, QUITÉ LA PRIMERA POR SER LA DEL PURSE. ¿CÓMO VA?
main(
  "1d82c1dc9522c0b41be40d414a46c654ed66c7000030130c15ee617013bb81b9",
  participantKeys
);
