## __Neural Style Transfer__

This project utilizes neural style transfer techniques to transfer the style of a given content image into another image provided by the style given. The paper titled [A Neural Algorithm of Artistic Style](https://arxiv.org/abs/1508.06576) by Leon A. Gatys, Alexander S. Ecker, Matthias Bethge, (2015) has served as a fundamental reference for this project.

Website link: [https://melo04.github.io/Neural-style-transfer/](https://melo04.github.io/Neural-style-transfer/)

[Jupyter Notebook](https://github.com/Melo04/Neural-style-transfer/blob/main/notebook.ipynb)

## __What is Neural Style Transfer (NST)__

Neural Style Transfer (NST) is an optimization technique used to merge
two images—a content image and a style reference image and blend them together so the output image looks like the content image, but “painted” in the style of the style reference image. Below contains an example that maps the artistic style of [The Starry Night](https://en.wikipedia.org/wiki/The_Starry_Night) onto a night-time photograph of the tower nearby Stanford campus:

<div align="center">
 <img src="./img/starry_night.jpg" height="223px">
 <img src="./img/readme/stanford_tower.jpg" height="223px">
 <img src="./img/readme/generated_tower.png" width="710px">
</div>

## __Examples__
Applying the style of different images produce different interesting results. Here we renders a photograph to a variety of styles. Feel free to try it out in the website too.

<div align="center">
<img src="./img/bridge.jpg" height="150px">
<img src="./img/readme/starry_bridge.jpg" height="150px">
<img src="./img/readme/fire_bridge.png" height="150px">

<img src="./img/readme/style_bridge.png" height="150px">
<img src="./img/readme/kanaga_bridge.png" height="150px">
<img src="./img/readme/corridor_bridge.png" height="150px">

<img src="./img/readme/scream_bridge.png" height="150px">
<img src="./img/readme/amadeo_bridge.png" height="150px">
<img src="./img/readme/picasso_bridge.png" height="150px">
</div>

The following reproduce Figure 3 from the [paper](https://arxiv.org/abs/1508.06576), which renders a photograph of the Neckarfront in Tübingen, Germany in the style of 4 different iconic paintings [The Starry Night](https://www.wikiart.org/en/vincent-van-gogh/the-starry-night-1889), [Composition VII](https://www.wikiart.org/en/wassily-kandinsky/composition-vii-1913), [The Scream](https://www.wikiart.org/en/edvard-munch/the-scream-1893), [Corridor](https://www.wikiart.org/en/vincent-van-gogh/corridor-in-the-asylum-1889):

<div align="center">
 <img src="./img/tuebingen.jpg" height="223px">
</div>

<div align="center">
<img src="./img/starry_night.jpg" height="220px">
<img src="./img/readme/tuebingen_starry.png" height="220px">
</div>

<div align="center">
<img src="./img/kandinsky_composition_7.jpg" height="220px">
<img src="./img/readme/tubingen_kandisky.png" height="220px">
</div>

<div align="center">
<img src="./img/munch_scream.jpg" height="220px">
<img src="./img/readme/tuebingen_scream.png" height="220px">
</div>

<div align="center">
<img src="./img/corridor.jpg" height="220px">
<img src="./img/readme/tuebingen_corridor.png" height="220px">
</div>

## __Content/Style Tradeoff__
The relative weight of the style and content can be controlled.

Example below renders a lion photograph image with an increasing style weight applied to the style of [Amadeo Cardoso](https://en.citaliarestauro.com/amadeo-de-souza-cardoso-a-fabulous-painter/)

<div align="center">
<img src="./img/lion.jpg" height="220px">
<img src="./img/amadeo_cardoso.jpg" height="220px">
</div>

<div align="center">
<img src="./img/readme/lion_1.png" height="180px">
<img src="./img/readme/lion_2.png" height="180px">
<img src="./img/readme/lion_3.png" height="180px">
<img src="./img/readme/lion_4.png" height="180px">
</div>

## __Compilation Instruction__
1. To run it locally, install [Yarn](https://classic.yarnpkg.com/en/) and run the command below in your terminal to get all the dependecies.
```bash
yarn run prep
```

2. Then, run this command below and go to ```localhost:9966``` to view the web application.
```bash
yarn run start
```