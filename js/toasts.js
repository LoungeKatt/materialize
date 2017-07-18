(function() {
  'use strict';

  let _defaults = {
    displayLength: Infinity,
    inDuration: 300,
    outDuration: 375,
    className: undefined,
    completeCallback: undefined,
    activationPercent: 0.8
  };

  class Toast {
    constructor(message, displayLength, className, completeCallback) {
      if (!message) {
        return;
      }

      this.options = {
        displayLength: displayLength,
        className: className,
        completeCallback: completeCallback
      };
      this.options = $.extend({}, Toast.defaults, this.options);
      this.message = message;
      this.panning = false;
      this.timeRemaining = this.options.displayLength;

      if (Toast._count === 0) {
        Toast._createContainer();
      }

      // Create new toast
      Toast._count++;
      let toastElement = this.createToast();
      toastElement.M_Toast = this;
      this.el = toastElement;
      this._animateIn();
      this.setTimer();
    }

    static get defaults() {
      return _defaults;
    }

    static _createContainer() {
      let container = document.createElement('div');
      container.setAttribute('id', 'toast-container');

      // Add event handler
      container.addEventListener('touchstart', Toast._onDragStart);
      container.addEventListener('touchmove', Toast._onDragMove);
      container.addEventListener('touchend', Toast._onDragEnd);

      container.addEventListener('mousedown', Toast._onDragStart);
      document.addEventListener('mousemove', Toast._onDragMove);
      document.addEventListener('mouseup', Toast._onDragEnd);

      document.body.appendChild(container);
      Toast._container = container;
    }

    static _removeContainer() {
      // Add event handler
      document.removeEventListener('mousemove', Toast._onDragMove);
      document.removeEventListener('mouseup', Toast._onDragEnd);

      Toast._container.parentNode.removeChild(Toast._container);
      Toast._container = null;
    }

    static _onDragStart(e) {
      if (e.target && $(e.target).closest('.toast').length) {
        let $toast = $(e.target).closest('.toast');
        let toast = $toast[0].M_Toast;
        toast.panning = true;
        Toast._draggedToast = toast;
        $toast[0].style.transition = null;
        toast.startingXPos = Toast._xPos(e);
        toast.time = Date.now();
        toast.xPos = Toast._xPos(e);
      }
    }

    static _onDragMove(e) {
      if (!!Toast._draggedToast) {
        e.preventDefault();
        let toast = Toast._draggedToast;
        toast.deltaX = Math.abs(toast.xPos - Toast._xPos(e));
        toast.xPos = Toast._xPos(e);
        toast.velocityX = toast.deltaX / (Date.now() - toast.time);
        toast.time = Date.now();

        let totalDeltaX = toast.xPos - toast.startingXPos;
        let activationDistance =
            toast.el.offsetWidth * toast.options.activationPercent;
        toast.el.style.transform = `translateX(${totalDeltaX}px)`;
        toast.el.style.opacity = 1-Math.abs(totalDeltaX / activationDistance);
      }
    }

    static _onDragEnd(e) {
      if (!!Toast._draggedToast) {
        let toast = Toast._draggedToast;
        toast.panning = false;

        let totalDeltaX = toast.xPos - toast.startingXPos;
        let activationDistance =
            toast.el.offsetWidth * toast.options.activationPercent;
        let shouldBeDismissed = Math.abs(totalDeltaX) > activationDistance ||
            toast.velocityX > 1;
        if (shouldBeDismissed) {
          toast.wasSwiped = true;
          toast.remove();

        } else {
          toast.el.style.transition = 'transform .2s, opacity .2s';
          toast.el.style.transform = null;
          toast.el.style.opacity = null;
        }
        Toast._draggedToast = null;
      }
    }

    static _xPos(e) {
      if (e.targetTouches && (e.targetTouches.length >= 1)) {
        return e.targetTouches[0].clientX;
      }
      // mouse event
      return e.clientX;
    }

    createToast() {
      let toast = document.createElement('div');
      toast.classList.add('toast');

      // Add custom classes onto toast
      if (this.options.className) {
        var classes = this.options.className.split(' ');
        for (var i = 0, count = classes.length; i < count; i++) {
          toast.classList.add(classes[i]);
        }
      }

      // Set content
      if ( typeof HTMLElement === 'object' ?
           this.message instanceof HTMLElement :
           this.message && typeof this.message === 'object' &&
           this.message !== null && this.message.nodeType === 1 &&
           typeof this.message.nodeName==='string'
         ) {
        toast.appendChild(this.message);

      // Check if it is jQuery object
      } else if (this.message instanceof jQuery) {
        $(toast).append(this.message);

        // Insert as text;
      } else {
        toast.innerHTML = this.message;
      }

      // Append toasft
      Toast._container.appendChild(toast);
      return toast;
    }

    _animateIn() {
      // Animate toast in
      Vel(this.el, {top: 0,  opacity: 1 }, {
        duration: 300,
        easing: 'easeOutCubic',
        queue: false
      });
    }

    setTimer() {
      if (this.timeRemaining !== Infinity)  {
        this.counterInterval = setInterval(() => {
          // If toast is not being dragged, decrease its time remaining
          if (!this.panning) {
            this.timeRemaining -= 20;
          }

          // Animate toast out
          if (this.timeRemaining <= 0) {
            this.remove();
          }
        }, 20);
      }
    }

    remove() {
      window.clearInterval(this.counterInterval);
      let activationDistance =
          this.el.offsetWidth * this.options.activationPercent;

      if(toast.wasSwiped) {
        this.el.style.transition = 'transform .05s, opacity .05s';
        this.el.style.transform = `translateX(${activationDistance}px)`;
        this.el.style.opacity = 0;
      }

      Vel(
        this.el,
        {opacity: 0, marginTop: '-40px'},
        {
          duration: this.options.outDuration,
          easing: 'easeOutExpo',
          queue: false,
          complete: () => {
            // Call the optional callback
            if(typeof(this.options.completeCallback) === 'function') {
              this.options.completeCallback();
            }
            // Remove toast from DOM
            this.el.parentNode.removeChild(this.el);
            Toast._count--;
            if (Toast._count === 0) {
              Toast._removeContainer();
            }
          }
        }
      );
    }
  }

  /**
   * @static
   * @memberof Toast
   */
  Toast._count = 0;

  /**
   * @static
   * @memberof Toast
   */
  Toast._container = null;

  /**
   * @static
   * @memberof Toast
   */
  Toast._draggedToast = null;

  window.Materialize.Toast = Toast;
  window.Materialize.toast = function(message, displayLength, className, completeCallback) {
    return new Toast(message, displayLength, className, completeCallback);
  }
// };
})();
