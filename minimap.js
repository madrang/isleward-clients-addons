/** Mad's Isleward MiniMap Addon
 *  - Version: 0.0.2
 */
addons.register({ ADDON_NAME: "Mads Super Addon"
    , mapScale: 4
    , itemColors: {
        default:  "#FF00FF" // Purple
        , mobs: {
            default: "#FF0000" // Red
        }
        , characters: {
            default: "#00FF00" // Green
        }
        , me: "#FFFF00" // Yellow
        , player: {
            default: "#FFFF00" // Yellow
        }
        , hidden: {
            default: "#ABABAB" // Gray
            , sound: "#9A9AFF"
        }
        , bigObjects: {
            default: "#0000FF" // Blue
        }
    }
    , init: function(events) {
        console.info("Initializing:", this.ADDON_NAME);
        this.exports.CONSTANTS(this.exports);
        this.uiContainer = $(".ui-container");
        this.uiMap = $(`<canvas class="addon-uiMap" style="display:none;"></canvas>`).appendTo(this.uiContainer);

        events.on("onGetMap", this.onGetMap.bind(this));
        events.on("onGetObject", this.onGetObject.bind(this));

        events.on("onKeyDown", this.onKeyDown.bind(this));
        events.on("onKeyUp", this.onKeyUp.bind(this));

        this.drawMap = debounce(this.drawMap, 150, true, true);
        this.getObjectsModule().then((result) => console.log("getObjectsModule", result), console.error);
    }
    , getObjectsModule: async function () {
        return new Promise((resolve) => {
            require(["js/objects/objects"], (o) => {
                this.objectsModule = o;
                resolve(o);
            });
        });
    }
    , onGetMap: function(mapData) {
        if (!mapData.collisionMap) {
            console.error("onGetMap: CollisionMap not found!")
            return;
        }
        console.debug("MapData updated %o loading %s", mapData, mapData.zoneId);
        this.collisionMap = mapData.collisionMap;
    }
    , onGetObject: function(object) {
        if (!object.id) {
            return;
        }
        this.drawMap();
    }
    , onKeyDown: function(key) {
        if (!key) {
            return;
        }
        this.lastInput = Date.now();
        if (key == "m") {
            this.toggleMap();
            return;
        }
        if (this.uiMap.css("display") != "block") {
            // Map hidden...
            return;
        }
        if (key == "13" && this.mapScale > 1) {
            this.mapScale--;
            this.drawMap();
            return;
        }
        if (key == "11" && this.mapScale < 11) {
            this.mapScale++;
            this.drawMap();
            return;
        }
        console.log("Key down:", key);
    }
    , onKeyUp: function(key) {
    }
    , toggleMap: function() {
        if (this.uiMap.css("display") == "block") {
            console.log("Hidding Map");
            this.uiContainer.removeClass("blocking");
            this.uiMap.css("display", "none");
            return;
        }
        if (!this.collisionMap) {
            console.error("toggleMap: CollisionMap not found!");
            return;
        }
        console.log("Displaying Map");
        this.uiMap.css("display", "block");
        this.uiContainer.addClass("blocking");
        this.drawMap();
    }
    , drawMap: function() {
        if (!this.collisionMap) {
            return;
        }

        this.uiMap[0].width = this.collisionMap[0].length * this.mapScale;
        this.uiMap[0].height = this.collisionMap.length * this.mapScale;

        var ctx = this.uiMap[0].getContext('2d');
        ctx.scale(this.mapScale, this.mapScale);
        ctx.clearRect(0, 0, this.uiMap[0].width, this.uiMap[0].height);

        for (let i = 0; i < this.collisionMap.length; i++) {
            for (let j = 0; j < this.collisionMap[i].length; j++) {
                if (this.collisionMap[j][i]) {
                    // Collision
                    ctx.fillStyle = "rgba(117, 123, 146, 0.2)";
                } else {
                    // Walkable
                    ctx.fillStyle = "rgba(0, 0, 0, 1)";
                }
                ctx.fillRect(j, i, 1, 1);
            }
        }
        this.objectsModule.objects.forEach((obj) => {
            if (obj.destroyed || !obj.updateVisibility) {
                return;
            }
            this.drawMapItem(ctx, obj);
        });
        if (Date.now() % 1000 > 500) { // Blink each half second when obscured.
            // Draw player again on top of other objects.
            this.drawMapItem(ctx, window.player);
        }

        this.uiMap.css({
            "position": "absolute"
            , "left": (this.uiContainer[0].clientWidth / 2) - (this.uiMap[0].width / 2)
            , "top": (this.uiContainer[0].clientHeight / 2) - (this.uiMap[0].height / 2)
            , "background-color": "transparent"
            , "border": "4px solid #505360"
        });
    }
    , getItemType: function(obj) {
        if (obj.isVisible && obj.sprite) {
            if (obj.account || obj.player) {
                if (window.player.id == obj.id) {
                    return "me";
                }
                return ["player", obj.account || obj.name];
            }
            return [obj.sheetName, obj.name];
        }
        if (obj.sound) {
            return ["hidden", "sound"];
        }
        //obj.aggro
        //obj.isRare
        return ["hidden", obj.name];
    }
    , getMapItemColor: function(itemTypeInfo) {
        if (typeof itemTypeInfo == "object") {
            itemTypeInfo = this.getItemType(itemTypeInfo);
        }
        if (typeof itemTypeInfo == "string") {
            itemTypeInfo = itemTypeInfo.split(".");
        }
        const colorDef = this.itemColors[itemTypeInfo[0]];
        if (typeof colorDef == "string") {
            return colorDef;
        } else if (colorDef) {
            return colorDef[itemTypeInfo[1]] || colorDef.default;
        }
        return this.itemColors.default;
    }
    , drawMapItem: function(ctx, obj) {
        ctx.fillStyle = this.getMapItemColor(obj);
        ctx.fillRect(obj.x, obj.y, 1, 1);
    }
    , exports: {
        CONSTANTS: (params, obj, enumerable = true) => {
            const properties = {};
            if (typeof params === "object") {
                params = [].concat(
                    Object.getOwnPropertySymbols(params).map(s => [s, params[s]])
                    , Object.entries(params)
                );
            }
            if (Array.isArray(params)) {
                params.forEach(([key, val]) => (properties)[key] = { value: val, writable: false, configurable: true, enumerable });
            } else {
                throw new Error("Invalid params type");
            }
            Object.defineProperties(obj || window, properties);
        }
        /** Pause the execution of an async function until timer elapse.
         * @Returns a promise that will resolve after the specified timeout.
         */
        , asyncDelay: function (timeout) {
            return new Promise(function(resolve, reject) {
                setTimeout(resolve, timeout, true)
            })
        }
        , makeQuerablePromise: function (promise) {
            if (typeof promise !== 'object') {
                throw new Error('promise is not an object.')
            }
            if (!(promise instanceof Promise)) {
                throw new Error('Argument is not a promise.')
            }
            // Don't modify a promise that's been already modified.
            if ('isResolved' in promise || 'isRejected' in promise || 'isPending' in promise) {
                return promise
            }
            let isPending = true
            let isRejected = false
            let rejectReason = undefined
            let isResolved = false
            let resolvedValue = undefined
            const qurPro = promise.then(
                function(val){
                    isResolved = true
                    isPending = false
                    resolvedValue = val
                    return val
                }
                , function(reason) {
                    rejectReason = reason
                    isRejected = true
                    isPending = false
                    throw reason
                }
            )
            Object.defineProperties(qurPro, {
                'isResolved': {
                    get: () => isResolved
                }
                , 'resolvedValue': {
                    get: () => resolvedValue
                }
                , 'isPending': {
                    get: () => isPending
                }
                , 'isRejected': {
                    get: () => isRejected
                }
                , 'rejectReason': {
                    get: () => rejectReason
                }
            })
            return qurPro
        }
        , PromiseSource: function () {
            const srcPromise = new Promise((resolve, reject) => {
                Object.defineProperties(this, {
                    resolve: { value: resolve, writable: false }
                    , reject: { value: reject, writable: false }
                })
            })
            Object.defineProperties(this, {
                promise: {value: makeQuerablePromise(srcPromise), writable: false}
            })
        }
        /** A debounce is a higher-order function, which is a function that returns another function
        * that, as long as it continues to be invoked, will not be triggered.
        * The function will be called after it stops being called for N milliseconds.
        * If `immediate` is passed, trigger the function on the leading edge, instead of the trailing.
        * @Returns a promise that will resolve to func return value.
        */
        , debounce: function(func, wait, immediate, allowRepeat) {
            if (typeof wait === "undefined") {
                wait = 40
            }
            if (typeof wait !== "number") {
                throw new Error("wait is not an number.")
            }
            let timeout = null
            let lastPromiseSrc = new PromiseSource()
            const applyFn = function(context, args) {
                if (!lastPromiseSrc) {
                    return
                }
                let result = undefined
                try {
                    result = func.apply(context, args)
                } catch (err) {
                    lastPromiseSrc.reject(err)
                    lastPromiseSrc = null
                    return
                }
                if (result instanceof Promise) {
                    result.then(lastPromiseSrc.resolve, lastPromiseSrc.reject)
                } else {
                    lastPromiseSrc.resolve(result)
                }
                lastPromiseSrc = null
            }
            return function(...args) {
                const callNow = Boolean(immediate && !timeout)
                const context = this;
                if (!lastPromiseSrc) {
                    lastPromiseSrc = new PromiseSource()
                }
                const currentPromiseSrc = lastPromiseSrc
                if (timeout) {
                    if (allowRepeat) {
                        return
                    }
                    clearTimeout(timeout)
                }
                timeout = setTimeout(function () {
                    if (!immediate) {
                        applyFn(context, args)
                    }
                    timeout = null
                }, wait)
                if (callNow) {
                    applyFn(context, args)
                }
                return currentPromiseSrc.promise
            }
        }
    }
});
