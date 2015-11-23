(function(options) {
  var backgrounds = options.backgrounds
  var updateInterval = 30 // sec, 0 disable auto update

  var loaderEl = document.querySelector(".js-putainde-Tab-loader")
  var settingsEl = document.querySelector(".js-putainde-Tab-settings")
  var closeSettingsEl = document.querySelector(".js-putainde-Tab-settings-close")
  var toggleSettingsEl = document.querySelector(".js-putainde-Tab-toggleSettings")
  var backgroundEl = document.querySelector(".js-putainde-Tab-background")
  var imgEl
  var imgBlurEl
  var backgroundCreditsEl = document.querySelector(".js-putainde-Tab-backgroundCredit")
  var clockEl = document.querySelector(".js-putainde-Tab-time")
  var changeBackgroundEl = document.querySelector(".js-putainde-Tab-changeBackground")
  var madeByEl = document.querySelector(".js-putainde-Tab-footer-madeBy")

  if (window.hostname === "putaindecode.io") {
    madeByEl.style.display = "block"
  }

  var timeout

  /**
   * RUN THE SHIT
   *
   * `onload` is used so backgrounds huge list can be listed below, not above.
   * This make code easier to read.
   */
  window.onload = function() {
    startClock()

    loadRandomBackground(function() {
      // loader is useless after first load
      loaderEl.setAttribute("hidden", true)
    })

    changeBackgroundEl.addEventListener("click", function() {
      changeBackgroundEl.classList.add("putainde-Tab-animate-spin")
      loadRandomBackground(function() {
        onNextAnimationIteration(changeBackgroundEl, function() {
          changeBackgroundEl.classList.remove("putainde-Tab-animate-spin")
        })
      })
    })

    toggleSettingsEl.addEventListener("click", function() {
      settingsEl.classList.toggle("putainde-Tab-settings--hidden")
    })

    closeSettingsEl.addEventListener("click", function() {
      settingsEl.classList.toggle("putainde-Tab-settings--hidden", true)
    })

    loadCustomisations()

    // we can"t do that, history API is limited to current domain
    // well we don"t have a domain for file:/// so we are screwed...
    // any idea ?
    // https://github.com/putaindecode/tab/issues/2
    // history.pushState({}, "", "")
  }

  /**
   * load a random background
   */
  function loadRandomBackground(callback) {
    loadBackground(getRandomBackground(), function(item, img) {
      backgroundCreditsEl.innerHTML = ""

      var updated = false
      // first time page loading
      if (!imgEl) {
        updated = updateBackground(item, img)
      }
      else {
        imgEl.classList.add("putainde-Tab-background-img--hidden")
        if (imgBlurEl) {
          imgBlurEl.classList.add("putainde-Tab-background-imgBlur--hidden")
        }
        onNextTransitionEnd(imgEl, function() {
          updated = updateBackground(item, img)
        })
      }

      if (updateInterval) {
        if (timeout) {
          clearTimeout(timeout)
        }

        timeout = setTimeout(loadRandomBackground, updateInterval * 1000)
      }

      if (typeof callback === "function") {
        callback()
      }
    })
  }

  function updateBackground(item, img) {
    // prepare DOM
    backgroundEl.innerHTML = ""

    // get window orientation/ratio
    var windowOrientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait"
    var windowRatio = window.innerWidth / window.innerHeight

    // get image orientation/ratio
    // we cannot get real image orientation by simply using width & height cause of exif rotation
    // so we have to create the image in the DOM, then get computed width & height
    imgEl = document.createElement("img")
    imgEl.setAttribute("src", item.url)
    imgEl.classList.add("putainde-Tab-background-img") // this class contains the rules to fix the orientation
    imgEl.classList.add("putainde-Tab-background-img--hidden")

    backgroundEl.appendChild(imgEl)
    var imgStyle = window.getComputedStyle(imgEl)
    var imgWidth = parseInt(imgStyle.getPropertyValue("width"))
    var imgHeight = parseInt(imgStyle.getPropertyValue("height"))
    var imgOrientation = imgWidth > imgHeight ? "landscape" : "portrait"
    backgroundEl.removeChild(imgEl)
    var imgRatio = imgWidth / imgHeight


    imgEl.classList.add(imgOrientation === "landscape" ? "putainde-Tab-background-img--landscape" : "putainde-Tab-background-img--portrait")
    imgEl.classList.add(windowOrientation === "landscape" ? "putainde-Tab-background-img--windowLandscape" : "putainde-Tab-background-img--windowPortrait")
    imgEl.classList.add(windowRatio < imgRatio ? "putainde-Tab-background-img--ratioSuperiorThanWindow" : "putainde-Tab-background-img--ratioInferiorThanWindow")

    //console.log(windowOrientation, windowRatio, imgOrientation, imgRatio, imgEl.className)

    // when we have a image orientation that is different from the browser orientation
    // we stop the default "cover" behavior as it might hide too many parts of the picture
    // so we add a blurry background to keep something cool
    imgBlurEl = false
    if (windowOrientation !== imgOrientation) {
      imgBlurEl = document.createElement("img")
      imgBlurEl.setAttribute("src", item.url)
      imgBlurEl.classList.add("putainde-Tab-background-imgBlur")
      imgBlurEl.classList.add("putainde-Tab-background-imgBlur--hidden")
      backgroundEl.appendChild(imgBlurEl)
    }

    // add img after the blurred one to not have to play with z-index :)
    backgroundEl.appendChild(imgEl)

    // dom ready, begin visual transition
    imgEl.classList.remove("putainde-Tab-background-img--hidden")
    if (imgBlurEl) {
      imgBlurEl.classList.remove("putainde-Tab-background-imgBlur--hidden")
    }

    var credits = item.source ? "Credits: " + item.source : "If you know the source, please let us know."
    var title = item.title ? item.title : credits

    backgroundCreditsEl.setAttribute("href", item.sourceUrl)
    backgroundCreditsEl.innerHTML = title
    if (credits !== title) {
      backgroundCreditsEl.setAttribute("title", credits)
    }

    return true
  }

  /**
   * load a background then execute a callback
   *
   * @param {Object}   item     background object to load
   * @param {Function} callback callback to execute when image is loaded. First arg is the item itself, 2nd is the image object.
   */
  function loadBackground(item, callback) {
    var img = new Image()
    img.src = item.url
    if (typeof callback === "function") {
      img.onload = callback.bind(callback, item, img)
    }
  }

  /**
   * Returns a random integer between min (included) and max (excluded)
   *
   * Using Math.round() will give you a non-uniform distribution
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
   */
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * get a random background item
   */
  function getRandomBackground() {
    return backgrounds[getRandomInt(0, backgrounds.length - 1)]
  }

  /**
   * execute callback for the next transitionEnd
   * need to be called after the start or unexpected result might append
   *
   * @param {Object}   el       dom element to look at
   * @param {Function} callback function to execute at the end
   */
  function onNextTransitionEnd(el, callback) {
    onNextAnimationEnd(el, callback, {
      transition: "transitionend",
      OTransition: "otransitionend",
      MozTransition: "transitionend",
      WebkitTransition: "webkitTransitionEnd"
    })
  }

  /**
   * execute callback for the next animationIteration
   * need to be called after the start or unexpected result might append
   *
   * @param {Object}   el       dom element to look at
   * @param {Function} callback function to execute at the end
   */
  function onNextAnimationIteration(el, callback) {
    onNextAnimationEnd(el, callback, {
      animation: "animationiteration",
      OAnimation: "oanimationiteration",
      MozAnimation: "animationiteration",
      WebkitAnimation: "webkitAnimationIteration"
    })
  }

  /**
   * execute callback for the next animationEnd
   * need to be called after the start or unexpected result might append
   *
   * @param {Object}   el       dom element to look at
   * @param {Function} callback function to execute at the end
   * @param {Object}   animKeys optional anim keys (used for onNextTransitionEnd())
   */
  function onNextAnimationEnd(el, callback, animKeys) {
    var ani
    var anims = animKeys || {
      animation: "animationend",
      OAnimation: "oanimationend",
      MozAnimation: "animationend",
      WebkitAnimation: "webkitAnimationEnd"
    }

    var i
    for (i in anims) {
      if (anims.hasOwnProperty(i) && el.style[i] !== undefined) {
        ani = anims[i]
      }
    }

    var duration = parseInt(window.getComputedStyle(el).getPropertyValue("transition-duration")) || 1 // shitty fallback

    if (ani) {
      var cb = function() {
        callback()
        el.removeEventListener(ani, cb)
        clearTimeout(shittyFallback)
      }
      el.addEventListener(ani, cb, false)

      // transition end doesn't work properly when tab is in background on some browser (safari 7/8)
      // so we add a shitty timeout
      var shittyFallback = setTimeout(cb, (duration * 1000) + 200)
    }
    else {
      setTimeout(callback, 1000) // poor fallback - lol
    }
  }

  /**
   * start the clock
   */
  function startClock() {
    updateClock()

    // do not update each 60sec
    // because you don't know when you started
    // and you can miss a minute if you start at 00:00:40
    setInterval(updateClock, 10 * 1000)
  }

  /**
   * update the clock
   */
  function updateClock() {
    var date = new Date()
    var hours = date.getHours().toString()
    var minutes = date.getMinutes().toString()
    clockEl.innerHTML = (hours.length < 2 ? "0" : "") + hours + ":" + (minutes.length < 2 ? "0" : "") + minutes
  }

  /**
   * load user customisations
   */
  function loadCustomisations() {
    var queryString = window.location.search.slice(1)

    queryString.split("&").map(function(declaration) {
      var chunks = declaration.split("=", 2)
      var key = chunks[0]
      var value = chunks[1]

      switch (key) {
        case "scripts":
          var scriptUrls = value.split(",")
          loadCustomScripts(scriptUrls)
          break
        case "styles":
          var styleUrls = value.split(",")
          loadCustomStyles(styleUrls)
          break
      }
    })
  }

  /**
   * load custom user scripts
   */
  function loadCustomScripts(scriptUrls) {
    scriptUrls.forEach(function(url) {
      loadJS(url)
    })
  }

  /**
   * load custom user stylesheets
   */
  function loadCustomStyles(styleUrls) {
    styleUrls.forEach(function(url) {
      loadCSS(url)
    })
  }

  // https://github.com/filamentgroup/loadJS/blob/master/loadJS.js
  /*! loadJS: load a JS file asynchronously. [c]2014 @scottjehl, Filament Group, Inc. (Based on http://goo.gl/REQGQ by Paul Irish). Licensed MIT */
  function loadJS(src, cb) {
    "use strict";
    var ref = window.document.getElementsByTagName("script")[ 0 ]
    var script = window.document.createElement("script")
    script.src = src
    script.async = true
    ref.parentNode.insertBefore(script, ref)
    if (cb) {
      script.onload = cb
    }
    return script
  }

  // https://github.com/filamentgroup/loadCSS/blob/master/loadCSS.js
  /*! loadCSS: load a CSS file asynchronously. [c]2014 @scottjehl, Filament Group, Inc. Licensed MIT */
  function loadCSS(href, before, media) {
    "use strict";
    // Arguments explained:
    // `href` is the URL for your CSS file.
    // `before` optionally defines the element we'll use as a reference for injecting our <link>
    // By default, `before` uses the first <script> element in the page.
    // However, since the order in which stylesheets are referenced matters, you might need a more specific location in your document.
    // If so, pass a different reference element to the `before` argument and it'll insert before that instead
    // note: `insertBefore` is used instead of `appendChild`, for safety re: http://www.paulirish.com/2011/surefire-dom-element-insertion/
    var ss = window.document.createElement("link")
    var ref = before || window.document.getElementsByTagName("script")[0]
    ss.rel = "stylesheet"
    ss.href = href
    // temporarily, set media to something non-matching to ensure it'll fetch without blocking render
    ss.media = "only x"
    // inject link
    ref.parentNode.insertBefore(ss, ref)
    // set media back to `all` so that the stylesheet applies once it loads
    setTimeout(function() {
      ss.media = media || "all"
    })
    return ss
  }
})(window.putaindeTab)
