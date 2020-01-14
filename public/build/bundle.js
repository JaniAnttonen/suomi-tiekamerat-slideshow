
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/Slideshow.svelte generated by Svelte v3.16.7 */
    const file = "src/Slideshow.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (143:2) {#each image as image, index}
    function create_each_block(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*image*/ ctx[1].url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*image*/ ctx[1].url);
    			attr_dev(img, "class", "roadImage svelte-5eqntw");
    			add_location(img, file, 143, 4, 3527);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*image*/ 2 && img.src !== (img_src_value = /*image*/ ctx[1].url)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*image*/ 2 && img_alt_value !== (img_alt_value = /*image*/ ctx[1].url)) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(143:2) {#each image as image, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let h1;
    	let t1_value = /*currentLocation*/ ctx[0].municipality + "";
    	let t1;
    	let t2;
    	let span;
    	let t3_value = /*currentLocation*/ ctx[0].province + "";
    	let t3;
    	let each_value = /*image*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			span = element("span");
    			t3 = text(t3_value);
    			attr_dev(div0, "class", "slideShow svelte-5eqntw");
    			add_location(div0, file, 141, 0, 3467);
    			attr_dev(h1, "class", "svelte-5eqntw");
    			add_location(h1, file, 147, 2, 3634);
    			attr_dev(span, "class", "svelte-5eqntw");
    			add_location(span, file, 148, 2, 3676);
    			attr_dev(div1, "class", "currentLocation svelte-5eqntw");
    			add_location(div1, file, 146, 0, 3602);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, span);
    			append_dev(span, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*image*/ 2) {
    				each_value = /*image*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*currentLocation*/ 1 && t1_value !== (t1_value = /*currentLocation*/ ctx[0].municipality + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*currentLocation*/ 1 && t3_value !== (t3_value = /*currentLocation*/ ctx[0].province + "")) set_data_dev(t3, t3_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const imageBufferSize = 3;

    function instance($$self, $$props, $$invalidate) {
    	let cameras = [];
    	let stations = {};
    	const imageBuffer = [];
    	const imageStore = writable([]);
    	let image = [];
    	let currentLocation = { municipality: "", province: "" };

    	const timeout = time => {
    		try {
    			return new Promise(res => setTimeout(() => res(), time));
    		} catch(error) {
    			console.log(error.toString());
    		}
    	};

    	const fetchCameras = async () => {
    		const response = await fetch("https://tie.digitraffic.fi/api/v1/data/camera-data?lastUpdated=false");
    		const json = await response.json();

    		return json.cameraStations.map(cameraStation => cameraStation.cameraPresets.filter(camera => !camera.presentationName || camera.presentationName && !camera.presentationName.toLowerCase().includes("tien")).filter(camera => camera.imageUrl).map(camera => {
    			return {
    				id: cameraStation.id,
    				url: camera.imageUrl
    			};
    		})).flat();
    	};

    	const fetchStations = async () => {
    		const response = await fetch("https://tie.digitraffic.fi/api/v1/metadata/camera-stations?lastUpdated=false");
    		const json = await response.json();

    		json.features.forEach(cameraStation => stations[cameraStation.properties.id] = {
    			municipality: cameraStation.properties.municipality,
    			province: cameraStation.properties.province
    		});
    	};

    	const pushNewImageToBuffer = shift => {
    		shift && imageBuffer.shift();
    		const randInt = Math.floor(Math.random() * Math.floor(cameras.length));
    		imageBuffer.push(cameras[randInt]);
    		imageStore.set(imageBuffer);
    	};

    	const loop = async () => {
    		while (true) {
    			await timeout(20000);
    			pushNewImageToBuffer(true);
    		}
    	};

    	onMount(async () => {
    		cameras = await fetchCameras();
    		await fetchStations();
    		console.log(cameras);

    		for (let i = 0; i < imageBufferSize; i++) {
    			pushNewImageToBuffer(false);
    		}

    		loop();
    	});

    	const unsubscribe = imageStore.subscribe(input => {
    		$$invalidate(1, image = input);

    		if (input[0]) {
    			$$invalidate(0, currentLocation = stations[input[0].id]);
    		}
    	});

    	onDestroy(() => unsubscribe());

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("cameras" in $$props) cameras = $$props.cameras;
    		if ("stations" in $$props) stations = $$props.stations;
    		if ("image" in $$props) $$invalidate(1, image = $$props.image);
    		if ("currentLocation" in $$props) $$invalidate(0, currentLocation = $$props.currentLocation);
    	};

    	return [currentLocation, image];
    }

    class Slideshow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Slideshow",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.7 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let current;
    	const slideshow = new Slideshow({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(slideshow.$$.fragment);
    			attr_dev(main, "class", "svelte-g944tl");
    			add_location(main, file$1, 20, 0, 366);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(slideshow, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(slideshow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(slideshow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(slideshow);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self) {
    	var lunaReq = webOS.service.request("luna://com.palm.systemservice", {
    		method: "clock/getTime",
    		parameters: {},
    		onSuccess(args) {
    			console.log("UTC:", args.utc);
    		},
    		onFailure(args) {
    			
    		}
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("lunaReq" in $$props) lunaReq = $$props.lunaReq;
    	};

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    window.webOS=function(e){function t(r){if(n[r])return n[r].exports;var o=n[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,t),o.l=!0,o.exports}var n={};return t.m=e,t.c=n,t.i=function(e){return e},t.d=function(e,n,r){t.o(e,n)||Object.defineProperty(e,n,{configurable:!1,enumerable:!0,get:r});},t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,"a",n),n},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=7)}([function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},o={};if("object"===("undefined"==typeof window?"undefined":r(window))&&window.PalmSystem)if(window.navigator.userAgent.indexOf("SmartWatch")>-1)o.watch=!0;else if(window.navigator.userAgent.indexOf("SmartTV")>-1||window.navigator.userAgent.indexOf("Large Screen")>-1)o.tv=!0;else{try{var i=JSON.parse(window.PalmSystem.deviceInfo||"{}");if(i.platformVersionMajor&&i.platformVersionMinor){var s=Number(i.platformVersionMajor),a=Number(i.platformVersionMinor);s<3||3===s&&a<=0?o.legacy=!0:o.open=!0;}}catch(e){o.open=!0;}window.Mojo=window.Mojo||{relaunch:function(){}},window.PalmSystem.stageReady&&window.PalmSystem.stageReady();}else o.unknown=!0;t.default=o;},function(e,t,n){function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(t,"__esModule",{value:!0});var o=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r]);}return e},i=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),s={},a=function(e){var t=e;return "/"!==t.slice(-1)&&(t+="/"),t},c=t.LS2Request=function(){function e(){r(this,e),this.bridge=null,this.cancelled=!1,this.subscribe=!1;}return i(e,[{key:"send",value:function(e){var t=e.service,n=void 0===t?"":t,r=e.method,i=void 0===r?"":r,c=e.parameters,u=void 0===c?{}:c,l=e.onSuccess,f=void 0===l?function(){}:l,d=e.onFailure,m=void 0===d?function(){}:d,p=e.onComplete,v=void 0===p?function(){}:p,h=e.subscribe,w=void 0!==h&&h;if(!window.PalmServiceBridge){var y={errorCode:-1,errorText:"PalmServiceBridge is not found.",returnValue:!1};return m(y),v(y),console.error("PalmServiceBridge is not found."),this}this.ts&&s[this.ts]&&delete s[this.ts];var b=o({},u);return this.subscribe=w,this.subscribe&&(b.subscribe=this.subscribe),b.subscribe&&(this.subscribe=b.subscribe),this.ts=Date.now(),s[this.ts]=this,this.bridge=new PalmServiceBridge,this.bridge.onservicecallback=this.callback.bind(this,f,m,v),this.bridge.call(a(n)+i,JSON.stringify(b)),this}},{key:"callback",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:function(){},t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(){},n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:function(){},r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"";if(!this.cancelled){var o={};try{o=JSON.parse(r);}catch(e){o={errorCode:-1,errorText:r,returnValue:!1};}var i=o,s=i.errorCode,a=i.returnValue;void 0!==s||!1===a?(o.returnValue=!1,t(o)):(o.returnValue=!0,e(o)),n(o),this.subscribe||this.cancel();}}},{key:"cancel",value:function(){this.cancelled=!0,null!==this.bridge&&(this.bridge.cancel(),this.bridge=null),this.ts&&s[this.ts]&&delete s[this.ts];}}]),e}(),u={request:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=o({service:e},t);return (new c).send(n)}};t.default=u;},function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var r=t.fetchAppId=function(){return window.PalmSystem&&window.PalmSystem.identifier?window.PalmSystem.identifier.split(" ")[0]:""},o={};t.fetchAppInfo=function(e,t){if(0===Object.keys(o).length){var n=function(t,n){if(!t&&n)try{o=JSON.parse(n),e&&e(o);}catch(t){console.error("Unable to parse appinfo.json file for",r()),e&&e();}else e&&e();},i=new window.XMLHttpRequest;i.onreadystatechange=function(){4===i.readyState&&(i.status>=200&&i.status<300||0===i.status?n(null,i.responseText):n({status:404}));};try{i.open("GET",t||"appinfo.json",!0),i.send(null);}catch(e){n({status:404});}}else e&&e(o);},t.fetchAppRootPath=function(){var e=window.location.href;if("baseURI"in window.document)e=window.document.baseURI;else{var t=window.document.getElementsByTagName("base");t.length>0&&(e=t[0].href);}var n=e.match(new RegExp(".*://[^#]*/"));return n?n[0]:""},t.platformBack=function(){if(window.PalmSystem&&window.PalmSystem.platformBack)return window.PalmSystem.platformBack()};},function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var r=n(1),o=n(0),i=function(e){return e&&e.__esModule?e:{default:e}}(o),s={},a=function(e){if(0===Object.keys(s).length){try{var t=JSON.parse(window.PalmSystem.deviceInfo);s.modelName=t.modelName,s.version=t.platformVersion,s.versionMajor=t.platformVersionMajor,s.versionMinor=t.platformVersionMinor,s.versionDot=t.platformVersionDot,s.sdkVersion=t.platformVersion,s.screenWidth=t.screenWidth,s.screenHeight=t.screenHeight;}catch(e){s.modelName="webOS Device";}s.screenHeight=s.screenHeight||window.screen.height,s.screenWidth=s.screenWidth||window.screen.width,i.default.tv&&(new r.LS2Request).send({service:"luna://com.webos.service.tv.systemproperty",method:"getSystemInfo",parameters:{keys:["firmwareVersion","modelName","sdkVersion","UHD"]},onSuccess:function(t){if(s.modelName=t.modelName||s.modelName,s.sdkVersion=t.sdkVersion||s.sdkVersion,s.uhd="true"===t.UHD,t.firmwareVersion&&"0.0.0"!==t.firmwareVersion||(t.firmwareVersion=t.sdkVersion),t.firmwareVersion){s.version=t.firmwareVersion;for(var n=s.version.split("."),r=["versionMajor","versionMinor","versionDot"],o=0;o<r.length;o+=1)try{s[r[o]]=parseInt(n[o],10);}catch(e){s[r[o]]=n[o];}}e(s);},onFailure:function(){e(s);}});}else e(s);};t.default=a;},function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var r={isShowing:function(){return !!PalmSystem&&(PalmSystem.isKeyboardVisible||!1)}};t.default=r;},function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var r=function(){var e={};if(window.PalmSystem){if(window.PalmSystem.country){var t=JSON.parse(window.PalmSystem.country);e.country=t.country,e.smartServiceCountry=t.smartServiceCountry;}window.PalmSystem.timeZone&&(e.timezone=window.PalmSystem.timeZone);}return e};t.default=r;},function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});t.default="1.1.0";},function(e,t,n){function r(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(t,"__esModule",{value:!0}),t.systemInfo=t.service=t.platform=t.platformBack=t.libVersion=t.keyboard=t.fetchAppRootPath=t.fetchAppInfo=t.fetchAppId=t.deviceInfo=void 0;var o=n(2),i=n(1),s=r(i),a=n(3),c=r(a),u=n(4),l=r(u),f=n(0),d=r(f),m=n(5),p=r(m),v=n(6),h=r(v);t.deviceInfo=c.default,t.fetchAppId=o.fetchAppId,t.fetchAppInfo=o.fetchAppInfo,t.fetchAppRootPath=o.fetchAppRootPath,t.keyboard=l.default,t.libVersion=h.default,t.platformBack=o.platformBack,t.platform=d.default,t.service=s.default,t.systemInfo=p.default;}]);

    window.webOSDev=function(e){function t(n){if(r[n])return r[n].exports;var o=r[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,t),o.l=!0,o.exports}var r={};return t.m=e,t.c=r,t.i=function(e){return e},t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n});},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=6)}([function(e,t,r){function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(t,"__esModule",{value:!0});var o=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n]);}return e},i=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n);}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}(),a={},u=function(e){var t=e;return "/"!==t.slice(-1)&&(t+="/"),t},s=t.LS2Request=function(){function e(){n(this,e),this.bridge=null,this.cancelled=!1,this.subscribe=!1;}return i(e,[{key:"send",value:function(e){var t=e.service,r=void 0===t?"":t,n=e.method,i=void 0===n?"":n,s=e.parameters,c=void 0===s?{}:s,l=e.onSuccess,d=void 0===l?function(){}:l,f=e.onFailure,v=void 0===f?function(){}:f,h=e.onComplete,p=void 0===h?function(){}:h,m=e.subscribe,b=void 0!==m&&m;if(!window.PalmServiceBridge){var y={errorCode:-1,errorText:"PalmServiceBridge is not found.",returnValue:!1};return v(y),p(y),console.error("PalmServiceBridge is not found."),this}this.ts&&a[this.ts]&&delete a[this.ts];var O=o({},c);return this.subscribe=b,this.subscribe&&(O.subscribe=this.subscribe),O.subscribe&&(this.subscribe=O.subscribe),this.ts=Date.now(),a[this.ts]=this,this.bridge=new PalmServiceBridge,this.bridge.onservicecallback=this.callback.bind(this,d,v,p),this.bridge.call(u(r)+i,JSON.stringify(O)),this}},{key:"callback",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:function(){},t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(){},r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:function(){},n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"";if(!this.cancelled){var o={};try{o=JSON.parse(n);}catch(e){o={errorCode:-1,errorText:n,returnValue:!1};}var i=o,a=i.errorCode,u=i.returnValue;void 0!==a||!1===u?(o.returnValue=!1,t(o)):(o.returnValue=!0,e(o)),r(o),this.subscribe||this.cancel();}}},{key:"cancel",value:function(){this.cancelled=!0,null!==this.bridge&&(this.bridge.cancel(),this.bridge=null),this.ts&&a[this.ts]&&delete a[this.ts];}}]),e}(),c={request:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=o({service:e},t);return (new s).send(r)}};t.default=c;},function(e,t,r){function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(t,"__esModule",{value:!0}),t.drmAgent=t.DRM=void 0;var o=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n]);}return e},i=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n);}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}(),a=r(5),u=r(0),s={NOT_ERROR:-1,CLIENT_NOT_LOADED:0,VENDOR_ERROR:500,API_NOT_SUPPORTED:501,WRONG_CLIENT_ID:502,KEY_NOT_FOUND:503,INVALID_PARAMS:504,UNSUPPORTED_DRM_TYPE:505,INVALID_KEY_FORMAT:506,INVALID_TIME_INFO:507,UNKNOWN_ERROR:599},c={PLAYREADY:"playready",WIDEVINE:"widevine"},l={UNLOADED:0,LOADING:1,LOADED:2,UNLOADING:3},d=function(e){var t=e.method,r=e.parameters,n=e.onComplete;(new u.LS2Request).send({service:"luna://com.webos.service.drm",onComplete:n,method:t,parameters:r});},f=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:function(){},t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};setTimeout(function(){return e(t)},0);},v=function(e){return e.state===l.LOADED&&""!==e.getClientId()},h=function(e,t){var r=t.errorCode,n=void 0===r?s.UNKNOWN_ERROR:r,o=t.errorText,i=void 0===o?"Unknown error.":o,a={errorCode:n,errorText:i};return e.setError(a),a},p=function(e){var t="",r="";switch(e){case c.PLAYREADY:t="application/vnd.ms-playready.initiator+xml",r="urn:dvb:casystemid:19219";break;case c.WIDEVINE:t="application/widevine+xml",r="urn:dvb:casystemid:19156";}return {msgType:t,drmSystemId:r}},m={errorCode:s.CLIENT_NOT_LOADED,errorText:"DRM client is not loaded."},b=function(){function e(t){n(this,e),this.clientId="",this.drmType=t,this.errorCode=s.NOT_ERROR,this.errorText="",this.state=l.UNLOADED;}return i(e,[{key:"getClientId",value:function(){return this.clientId}},{key:"getDrmType",value:function(){return this.drmType}},{key:"getErrorCode",value:function(){return this.errorCode}},{key:"getErrorText",value:function(){return this.errorText}},{key:"setError",value:function(e){var t=e.errorCode,r=e.errorText;this.errorCode=t,this.errorText=r;}},{key:"isLoaded",value:function(e){var t=this,r=e.onSuccess,n=void 0===r?function(){}:r,i=e.onFailure,u=void 0===i?function(){}:i;d({method:"isLoaded",parameters:{appId:(0, a.fetchAppId)()},onComplete:function(e){if(!0===e.returnValue){if(t.clientId=e.clientId||"",t.state=e.loadStatus?l.LOADED:l.UNLOADED,!0===e.loadStatus&&e.drmType!==t.drmType){var r={errorCode:s.UNKNOWN_ERROR,errorText:"DRM types of set and loaded are not matched."};return u(h(t,r))}var i=o({},e);return delete i.returnValue,n(i)}return u(h(t,e))}});}},{key:"load",value:function(e){var t=this,r=e.onSuccess,n=void 0===r?function(){}:r,o=e.onFailure,i=void 0===o?function(){}:o;if(this.state===l.LOADING||this.state===l.LOADED)return void f(n,{isLoaded:!0,clientId:this.clientId});var u={appId:(0, a.fetchAppId)(),drmType:this.drmType};this.state=l.LOADING,d({method:"load",onComplete:function(e){return !0===e.returnValue?(t.clientId=e.clientId,t.state=l.LOADED,n({clientId:t.clientId})):i(h(t,e))},parameters:u});}},{key:"unload",value:function(e){var t=this,r=e.onSuccess,n=void 0===r?function(){}:r,o=e.onFailure,i=void 0===o?function(){}:o;if(!v(this))return void f(i,h(this,m));var a={clientId:this.clientId};this.state=l.UNLOADING,d({method:"unload",onComplete:function(e){return !0===e.returnValue?(t.clientId="",t.state=l.UNLOADED,n()):i(h(t,e))},parameters:a});}},{key:"getRightsError",value:function(e){var t=this,r=e.onSuccess,n=void 0===r?function(){}:r,i=e.onFailure,a=void 0===i?function(){}:i;if(!v(this))return void f(a,h(this,m));d({method:"getRightsError",parameters:{clientId:this.clientId,subscribe:!0},onComplete:function(e){if(!0===e.returnValue){var r=o({},e);return delete r.returnValue,n(r)}return a(h(t,e))}});}},{key:"sendDrmMessage",value:function(e){var t=this,r=e.msg,n=void 0===r?"":r,i=e.onSuccess,a=void 0===i?function(){}:i,u=e.onFailure,s=void 0===u?function(){}:u;if(!v(this))return void f(s,h(this,m));var c=p(this.drmType),l=o({clientId:this.clientId,msg:n},c);d({method:"sendDrmMessage",onComplete:function(e){if(!0===e.returnValue){var r=o({},e);return delete r.returnValue,a(r)}return s(h(t,e))},parameters:l});}}]),e}();t.DRM={Error:s,Type:c},t.drmAgent=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return ""===e?null:new b(e)};t.default=b;},function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0});var n=r(0),o=function(e){var t=e.onSuccess,r=void 0===t?function(){}:t,o=e.onFailure,i=void 0===o?function(){}:o;if(-1===navigator.userAgent.indexOf("Chrome"))return void setTimeout(function(){return i({errorCode:"ERROR.000",errorText:"Not supported."})},0);(new n.LS2Request).send({service:"luna://com.webos.service.sm",method:"deviceid/getIDs",parameters:{idType:["LGUDID"]},onComplete:function(e){if(!0===e.returnValue){var t=e.idList.filter(function(e){return "LGUDID"===e.idType})[0].idValue;return void r({id:t})}i({errorCode:e.errorCode,errorText:e.errorText});}});};t.default=o;},function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.launchParams=t.launch=t.APP=void 0;var n=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n]);}return e},o=r(0),i=t.APP={BROWSER:"APP_BROWSER"},a=function(e){var t=e.parameters,r=e.onSuccess,n=e.onFailure;(new o.LS2Request).send({service:"luna://com.webos.applicationManager",method:"launch",parameters:t,onComplete:function(e){var t=e.returnValue,o=e.errorCode,i=e.errorText;return !0===t?r():n({errorCode:o,errorText:i})}});};t.launch=function(e){var t=e.id,r=void 0===t?"":t,o=e.params,u=void 0===o?{}:o,s=e.onSuccess,c=void 0===s?function(){}:s,l=e.onFailure,d=void 0===l?function(){}:l,f=n({},{id:r,params:u});i.BROWSER===r&&(f.params.target=u.target||"",f.params.fullMode=!0,f.id="com.webos.app.browser"),a({parameters:f,onSuccess:c,onFailure:d});},t.launchParams=function(){var e={};if(window.PalmSystem&&""!==window.PalmSystem.launchParams)try{e=JSON.parse(window.PalmSystem.launchParams);}catch(e){console.error("JSON parsing error");}return e};},function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0});var n=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n]);}return e},o=r(0),i=function(e){var t=e.service,r=e.subscribe,i=e.onSuccess,a=e.onFailure;(new o.LS2Request).send({service:t,method:"getStatus",parameters:{subscribe:r},onComplete:function(e){var t=n({},e);if(delete t.returnValue,!0===e.returnValue)return delete t.subscribe,void i(t);delete t.returnValue,a(t);}});},a={getStatus:function(e){var t=e.onSuccess,r=void 0===t?function(){}:t,n=e.onFailure,o=void 0===n?function(){}:n,a=e.subscribe,u=void 0!==a&&a,s="webos.service";navigator.userAgent.indexOf("537.41")>-1&&(s="palm"),i({service:"luna://com."+s+".connectionmanager",subscribe:u,onSuccess:r,onFailure:o});}};t.default=a;},function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0});var n=t.fetchAppId=function(){return window.PalmSystem&&window.PalmSystem.identifier?window.PalmSystem.identifier.split(" ")[0]:""},o={};t.fetchAppInfo=function(e,t){if(0===Object.keys(o).length){var r=function(t,r){if(!t&&r)try{o=JSON.parse(r),e&&e(o);}catch(t){console.error("Unable to parse appinfo.json file for",n()),e&&e();}else e&&e();},i=new window.XMLHttpRequest;i.onreadystatechange=function(){4===i.readyState&&(i.status>=200&&i.status<300||0===i.status?r(null,i.responseText):r({status:404}));};try{i.open("GET",t||"appinfo.json",!0),i.send(null);}catch(e){r({status:404});}}else e&&e(o);},t.fetchAppRootPath=function(){var e=window.location.href;if("baseURI"in window.document)e=window.document.baseURI;else{var t=window.document.getElementsByTagName("base");t.length>0&&(e=t[0].href);}var r=e.match(new RegExp(".*://[^#]*/"));return r?r[0]:""},t.platformBack=function(){if(window.PalmSystem&&window.PalmSystem.platformBack)return window.PalmSystem.platformBack()};},function(e,t,r){function n(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(t,"__esModule",{value:!0}),t.LGUDID=t.launchParams=t.launch=t.drmAgent=t.DRM=t.connection=t.APP=void 0;var o=r(3),i=r(1),a=r(4),u=n(a),s=r(2),c=n(s);t.APP=o.APP,t.connection=u.default,t.DRM=i.DRM,t.drmAgent=i.drmAgent,t.launch=o.launch,t.launchParams=o.launchParams,t.LGUDID=c.default;}]);

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
