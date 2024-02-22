import "babel-polyfill";
import * as tf from "@tensorflow/tfjs";
tf.ENV.set("WEBGL_PACK", false);

class Main {
  constructor() {
    this.fileSelect = document.getElementById("file-select");

    this.loadMobileNetStyleModel()
      .then((model) => {
        this.styleNet = model;
      })
      .finally(() => this.enableStylizeButtons());

    this.loadTransformerModel()
      .then((model) => {
        this.transformNet = model;
      })
      .finally(() => this.enableStylizeButtons());

    this.initalizeWebcamVariables();
    this.generateImage();

    Promise.all([
      this.loadMobileNetStyleModel(),
      this.loadTransformerModel(),
    ]).then(([styleNet, transformNet]) => {
      this.styleNet = styleNet;
      this.transformNet = transformNet;
      this.enableStylizeButtons();
    });
  }

  async loadMobileNetStyleModel() {
    if (!this.mobileStyleNet) {
      this.mobileStyleNet = await tf.loadGraphModel(
        "models/style/model.json"
      );
    }

    return this.mobileStyleNet;
  }

  async loadTransformerModel() {
    if (!this.transformNet) {
      this.transformNet = await tf.loadGraphModel(
        "models/transformer/model.json"
      );
    }

    return this.transformNet;
  }

  initalizeWebcamVariables() {
    this.camModal = $("#cam-modal");

    this.snapButton = document.getElementById("snap-button");
    this.webcamVideoElement = document.getElementById("webcam-video");

    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    this.camModal.on("hidden.bs.modal", () => {
      this.stream.getTracks()[0].stop();
    });

    this.camModal.on("shown.bs.modal", () => {
      navigator.getUserMedia(
        {
          video: true,
        },
        (stream) => {
          this.stream = stream;
          this.webcamVideoElement.srcObject = stream;
          this.webcamVideoElement.play();
        },
        (err) => {
          console.error(err);
        }
      );
    });
  }

  openModal(element) {
    this.camModal.show();
    this.snapButton.onclick = () => {
      const hiddenCanvas = document.getElementById('hidden-canvas');
      const hiddenContext = hiddenCanvas.getContext('2d');
      hiddenCanvas.width = this.webcamVideoElement.width;
      hiddenCanvas.height = this.webcamVideoElement.height;
      hiddenContext.drawImage(this.webcamVideoElement, 0, 0, 
        hiddenCanvas.width, hiddenCanvas.height);
      const imageDataURL = hiddenCanvas.toDataURL('image/jpg');
      element.src = imageDataURL;
      this.camModal.hide();
    };
  }

  generateImage() {
    this.contentImg = document.getElementById("content-img");
    this.contentImg.onerror = () => {
      alert("Error loading " + this.contentImg.src + ".");
    };
    this.styleImg = document.getElementById("style-img");
    this.styleImg.onerror = () => {
      alert("Error loading " + this.styleImg.src + ".");
    };
    this.stylized = document.getElementById("stylized");

    this.contentImgSlider = document.getElementById("content-img-size");
    this.connectImageAndSizeSlider(this.contentImg, this.contentImgSlider);
    this.styleImgSlider = document.getElementById("style-img-size");
    this.connectImageAndSizeSlider(this.styleImg, this.styleImgSlider);

    this.styleRatio = 1.0;
    this.styleRatioSlider = document.getElementById("stylized-img-ratio");
    this.styleRatioSlider.oninput = (evt) => {
      this.styleRatio = evt.target.value / 100;
    };

    this.styleButton = document.getElementById("style-button");
    this.styleButton.onclick = () => {
      this.startStyling().finally(() => {
        this.enableStylizeButtons();
      });
    };
    this.randomizeButton = document.getElementById("randomize");
    this.randomizeButton.onclick = () => {
      this.styleRatioSlider.value = getRndInteger(0, 100);
      this.contentImgSlider.value = getRndInteger(256, 400);
      this.styleImgSlider.value = getRndInteger(100, 400);
      this.styleRatioSlider.dispatchEvent(new Event("input"));
      this.contentImgSlider.dispatchEvent(new Event("input"));
      this.styleImgSlider.dispatchEvent(new Event("input"));
    };

    this.contentSelect = document.getElementById("content-select");
    this.contentSelect.onchange = (evt) =>
      this.setImage(this.contentImg, evt.target.value);
    this.contentSelect.onclick = () => (this.contentSelect.value = "");
    this.styleSelect = document.getElementById("style-select");
    this.styleSelect.onchange = (evt) =>
      this.setImage(this.styleImg, evt.target.value);
    this.styleSelect.onclick = () => (this.styleSelect.value = "");
  }

  connectImageAndSizeSlider(img, slider) {
    slider.oninput = (evt) => {
      img.style.height = evt.target.value + "px";
      if (img.style.width) {
        img.style.width = img.style.height + "px";
      }
    };
  }

  setImage(element, selectedValue) {
    if (selectedValue === "file") {
      this.fileSelect.onchange = (evt) => {
        const f = evt.target.files[0];
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          element.src = e.target.result;
        };
        fileReader.readAsDataURL(f);
        this.fileSelect.value = "";
      };
      this.fileSelect.click();
    } else if (selectedValue === "pic") {
      this.openModal(element);
    } else {
      element.src = "img/" + selectedValue + ".jpg";
    }
  }

  enableStylizeButtons() {
    this.styleButton.disabled = false;
    this.randomizeButton.disabled = false;
    this.styleButton.textContent = "Generate Image";
  }

  async startStyling() {
    await tf.nextFrame();
    this.styleButton.textContent = "Generating image ...";
    await tf.nextFrame();
    let bottleneck = await tf.tidy(() => {
      return this.styleNet.predict(
        tf.browser
          .fromPixels(this.styleImg)
          .toFloat()
          .div(tf.scalar(255))
          .expandDims()
      );
    });
    if (this.styleRatio !== 1.0) {
      this.styleButton.textContent =
        "Generating image...";
      await tf.nextFrame();
      const identityBottleneck = await tf.tidy(() => {
        return this.styleNet.predict(
          tf.browser
            .fromPixels(this.contentImg)
            .toFloat()
            .div(tf.scalar(255))
            .expandDims()
        );
      });
      const styleBottleneck = bottleneck;
      bottleneck = await tf.tidy(() => {
        const styleBottleneckScaled = styleBottleneck.mul(
          tf.scalar(this.styleRatio)
        );
        const identityBottleneckScaled = identityBottleneck.mul(
          tf.scalar(1.0 - this.styleRatio)
        );
        return styleBottleneckScaled.add(identityBottleneckScaled);
      });
      styleBottleneck.dispose();
      identityBottleneck.dispose();
    }
    this.styleButton.textContent = "Stylizing image...";
    await tf.nextFrame();
    const stylized = await tf.tidy(() => {
      return this.transformNet
        .predict([
          tf.browser
            .fromPixels(this.contentImg)
            .toFloat()
            .div(tf.scalar(255))
            .expandDims(),
          bottleneck,
        ])
        .squeeze();
    });
    await tf.browser.toPixels(stylized, this.stylized);
    bottleneck.dispose();
    stylized.dispose();
  }

  async benchmark() {
    const x = tf.randomNormal([1, 256, 256, 3]);
    const bottleneck = tf.randomNormal([1, 1, 1, 100]);

    styleNet = await this.loadMobileNetStyleModel();
    time = await this.benchmarkStyle(x, styleNet);
    styleNet.dispose();

    transformNet = await this.loadTransformerModel();
    time = await this.benchmarkTransform(x, bottleneck, transformNet);
    transformNet.dispose();

    x.dispose();
    bottleneck.dispose();
  }

  async benchmarkStyle(x, styleNet) {
    const profile = await tf.profile(() => {
      tf.tidy(() => {
        const dummyOut = styleNet.predict(x);
        dummyOut.print();
      });
    });
    const time = await tf.time(() => {
      tf.tidy(() => {
        for (let i = 0; i < 10; i++) {
          const y = styleNet.predict(x);
          y.print();
        }
      });
    });
  }

  async benchmarkTransform(x, bottleneck, transformNet) {
    const profile = await tf.profile(() => {
      tf.tidy(() => {
        const dummyOut = transformNet.predict([x, bottleneck]);
        dummyOut.print();
      });
    });
    const time = await tf.time(() => {
      tf.tidy(() => {
        for (let i = 0; i < 10; i++) {
          const y = transformNet.predict([x, bottleneck]);
          y.print();
        }
      });
    });
  }
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
window.addEventListener("load", () => new Main());
