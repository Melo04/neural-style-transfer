import "babel-polyfill";
import * as tf from "@tensorflow/tfjs";
tf.ENV.set("WEBGL_PACK", false);

class Main {
  constructor() {
    this.fileSelect = document.getElementById("file-select");
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
    this.mobileStyleNet = this.mobileStyleNet || await tf.loadGraphModel("models/style/model.json");
    return this.mobileStyleNet;
  }

  async loadTransformerModel() {
    this.transformNet = this.transformNet || await tf.loadGraphModel("models/transformer/model.json");
    return this.transformNet;
  }

  // initialize webcam
  initalizeWebcam() {
    this.camModal = $("#cam-modal");
    this.snapButton = document.getElementById("snap-button");
    this.webcamVideoElement = document.getElementById("webcam-video");

    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

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
  }

  // open camera modal
  openCameraModal(element) {
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

  // generate image according to content and style image
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
    this.resizeImage(this.contentImg, this.contentImgSlider);
    this.styleImgSlider = document.getElementById("style-img-size");
    this.resizeImage(this.styleImg, this.styleImgSlider);

    this.styleRatio = 1.0;
    this.styleRatioSlider = document.getElementById("stylized-ratio");
    this.styleRatioSlider.oninput = (evt) => {
      this.styleRatio = evt.target.value / 100;
    };

    this.styleButton = document.getElementById("style-button");
    this.styleButton.onclick = () => {
      this.startStyling().finally(() => {
        this.enableStylizeButtons();
      });
    };

    // randomize parameters
    this.randomizeButton = document.getElementById("randomize");
    this.randomizeButton.onclick = () => {
      this.styleRatioSlider.value = getRndInteger(0, 100);
      this.contentImgSlider.value = getRndInteger(256, 350);
      this.styleImgSlider.value = getRndInteger(100, 400);
      this.styleRatioSlider.dispatchEvent(new Event("input"));
      this.contentImgSlider.dispatchEvent(new Event("input"));
      this.styleImgSlider.dispatchEvent(new Event("input"));
    };

    this.contentSelect = document.getElementById("content-select");
    this.camera = document.getElementById("camera");
    // enable web cam
    this.camera.onclick = () => {
      this.initalizeWebcam();
      this.setImage(this.contentImg, "pic");
    } 
    this.contentSelect.onchange = (evt) =>
      this.setImage(this.contentImg, evt.target.value);
    this.contentSelect.onclick = () => (this.contentSelect.value = "");
    this.styleSelect = document.getElementById("style-select");
    this.styleSelect.onchange = (evt) =>
      this.setImage(this.styleImg, evt.target.value);
    this.styleSelect.onclick = () => (this.styleSelect.value = "");
  }

  //resize image according to the slider value
  resizeImage(img, slider) {
    slider.oninput = (evt) => {
      img.style.height = evt.target.value + "px";
      if (img.style.width) {
        img.style.width = img.style.height + "px";
      }
    };
  }

  // set Image according to the user option (upload file, take picture or use the predefined image)
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
      this.openCameraModal(element);
    } else {
      element.src = "img/" + selectedValue + ".jpg";
    }
  }

  // enable stylize button when it is not generating image
  enableStylizeButtons() {
    this.styleButton.disabled = false;
    this.randomizeButton.disabled = false;
    this.styleButton.textContent = "Generate Image";
  }

  async startStyling() {
    await tf.nextFrame();
    this.styleButton.textContent = "Generating image ...";
    this.styleButton.disabled = true;
    await tf.nextFrame();
    //takes a styleImg, preprocesses it, passes it through the styleNet for inference
    let bottleneck = await tf.tidy(() => {
      return this.styleNet.predict(
        tf.browser
          //converts style image to tensor and pixel values to floats
          .fromPixels(this.styleImg)
          .toFloat()
          .div(tf.scalar(255))
          .expandDims()
      );
    });
    // if style ratio is not 1.0, blend style bottleneck with identity bottleneck
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
      //scale and blend style and identity bottlenecks
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

    // stylize the content image using the obtained bottleneck representation
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

    // convert stylized image tensor to pixel image and display it
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
    console.log(profile);
    const time = await tf.time(() => {
      tf.tidy(() => {
        for (let i = 0; i < 10; i++) {
          const y = transformNet.predict([x, bottleneck]);
          y.print();
        }
      });
    });
    console.log(time);
  }
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
window.addEventListener("load", () => new Main());
