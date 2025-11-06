"use strict";
var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b)
            if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError(
          "Class extends value " + String(b) + " is not a constructor or null"
        );
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();
var __esDecorate =
  (this && this.__esDecorate) ||
  function (
    ctor,
    descriptorIn,
    decorators,
    contextIn,
    initializers,
    extraInitializers
  ) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function")
        throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind,
      key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target =
      !descriptorIn && ctor
        ? contextIn["static"]
          ? ctor
          : ctor.prototype
        : null;
    var descriptor =
      descriptorIn ||
      (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _,
      done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) {
        if (done)
          throw new TypeError(
            "Cannot add initializers after decoration has completed"
          );
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(
        kind === "accessor"
          ? { get: descriptor.get, set: descriptor.set }
          : descriptor[key],
        context
      );
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object")
          throw new TypeError("Object expected");
        if ((_ = accept(result.get))) descriptor.get = _;
        if ((_ = accept(result.set))) descriptor.set = _;
        if ((_ = accept(result.init))) initializers.unshift(_);
      } else if ((_ = accept(result))) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
var __runInitializers =
  (this && this.__runInitializers) ||
  function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue
        ? initializers[i].call(thisArg, value)
        : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Escrowcontract = exports.SIGS = void 0;
var scrypt_ts_1 = require("scrypt-ts");
exports.SIGS = 5;
var nec = exports.SIGS - 2;
var Escrowcontract = (function () {
  var _a;
  var _classSuper = scrypt_ts_1.SmartContract;
  var _instanceExtraInitializers = [];
  var _addresses_decorators;
  var _addresses_initializers = [];
  var _matureTime_decorators;
  var _matureTime_initializers = [];
  var _pay_decorators;
  var _refundDeadline_decorators;
  return (
    (_a = /** @class */ (function (_super) {
      __extends(Escrowcontract, _super);
      function Escrowcontract(addresses, matureTime) {
        var _this = _super.apply(this, arguments) || this;
        _this.addresses =
          (__runInitializers(_this, _instanceExtraInitializers),
          __runInitializers(_this, _addresses_initializers, void 0));
        _this.matureTime = __runInitializers(
          _this,
          _matureTime_initializers,
          void 0
        );
        _this.addresses = addresses;
        _this.matureTime = matureTime;
        return _this;
      }
      Escrowcontract.prototype.pay = function (signatures, publicKeys) {
        var validSigs = 0;
        for (var i = 0; i < exports.SIGS; i++) {
          // Primero verifica que la public key sea de una dirección autorizada
          if ((0, scrypt_ts_1.hash160)(publicKeys[i]) == this.addresses[i]) {
            // Luego verifica que la firma sea válida para ESA public key
            if (this.checkSig(signatures[i], publicKeys[i])) {
              validSigs++;
            }
          }
        }
        (0, scrypt_ts_1.assert)(
          validSigs >= nec,
          "not enough valid signatures"
        );
      };
      Escrowcontract.prototype.refundDeadline = function (
        signatures,
        publicKeys
      ) {
        //const pubKeyHash: Ripemd160 = hash160(publicKeys[1])
        //assert(pubKeyHash == this.addresses[1], 'First Address mismatch')
        //let validSignaturesCount = 0n;
        //let validAddsCount = 0n;
        /*for (let i = 0; i < SIGS; i++) {
                    const pubKeyHash: Ripemd160 = hash160(publicKeys[i])
                    if (pubKeyHash == this.addresses[i]) {
                        console.log(`${pubKeyHash} debería ser igual a ${this.addresses[i]}`)
                        validAddsCount++;
                    }
                    if (this.checkSig(signatures[i], publicKeys[i])) {
                        validSignaturesCount++;
                    }
                }*/
        var validSigs = 0;
        for (var i = 0; i < exports.SIGS; i++) {
          // Primero verifica que la public key sea de una dirección autorizada
          if ((0, scrypt_ts_1.hash160)(publicKeys[i]) == this.addresses[i]) {
            // Luego verifica que la firma sea válida para ESA public key
            if (this.checkSig(signatures[i], publicKeys[i])) {
              validSigs++;
            }
          }
        }
        (0, scrypt_ts_1.assert)(
          validSigs >= nec,
          "not enough valid signatures"
        );
        //assert(validSignaturesCount >= nec, 'Not enough valid signatures')
        //assert(validAddsCount >= nec, 'Addresses mismatch or insufficient signers')
        (0, scrypt_ts_1.assert)(
          this.timeLock(this.matureTime),
          "deadline not yet reached"
        );
      };
      return Escrowcontract;
    })(_classSuper)),
    (function () {
      var _b;
      var _metadata =
        typeof Symbol === "function" && Symbol.metadata
          ? Object.create(
              (_b = _classSuper[Symbol.metadata]) !== null && _b !== void 0
                ? _b
                : null
            )
          : void 0;
      _addresses_decorators = [(0, scrypt_ts_1.prop)()];
      _matureTime_decorators = [(0, scrypt_ts_1.prop)()];
      _pay_decorators = [(0, scrypt_ts_1.method)()];
      _refundDeadline_decorators = [(0, scrypt_ts_1.method)()];
      __esDecorate(
        _a,
        null,
        _pay_decorators,
        {
          kind: "method",
          name: "pay",
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return "pay" in obj;
            },
            get: function (obj) {
              return obj.pay;
            },
          },
          metadata: _metadata,
        },
        null,
        _instanceExtraInitializers
      );
      __esDecorate(
        _a,
        null,
        _refundDeadline_decorators,
        {
          kind: "method",
          name: "refundDeadline",
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return "refundDeadline" in obj;
            },
            get: function (obj) {
              return obj.refundDeadline;
            },
          },
          metadata: _metadata,
        },
        null,
        _instanceExtraInitializers
      );
      __esDecorate(
        null,
        null,
        _addresses_decorators,
        {
          kind: "field",
          name: "addresses",
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return "addresses" in obj;
            },
            get: function (obj) {
              return obj.addresses;
            },
            set: function (obj, value) {
              obj.addresses = value;
            },
          },
          metadata: _metadata,
        },
        _addresses_initializers,
        _instanceExtraInitializers
      );
      __esDecorate(
        null,
        null,
        _matureTime_decorators,
        {
          kind: "field",
          name: "matureTime",
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return "matureTime" in obj;
            },
            get: function (obj) {
              return obj.matureTime;
            },
            set: function (obj, value) {
              obj.matureTime = value;
            },
          },
          metadata: _metadata,
        },
        _matureTime_initializers,
        _instanceExtraInitializers
      );
      if (_metadata)
        Object.defineProperty(_a, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    })(),
    _a
  );
})();
exports.Escrowcontract = Escrowcontract;
