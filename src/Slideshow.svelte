<script>
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";

  let cameras = [];
  let stations = {};
  const imageBufferSize = 3;
  const imageBuffer = [];
  const imageStore = writable([]);
  let image = [];
  let currentLocation = { municipality: "", province: "" };

  const timeout = time => {
    try {
      return new Promise(res => setTimeout(() => res(), time));
    } catch (error) {
      console.log(error.toString());
    }
  };

  const fetchCameras = async () => {
    const response = await fetch(
      "https://tie.digitraffic.fi/api/v1/data/camera-data?lastUpdated=false"
    );
    const json = await response.json();
    return json.cameraStations
      .map(cameraStation =>
        cameraStation.cameraPresets
          .filter(
            camera =>
              !camera.presentationName ||
              (camera.presentationName &&
                !camera.presentationName.toLowerCase().includes("tien"))
          )
          .filter(camera => camera.imageUrl)
          .map(camera => {
            return { id: cameraStation.id, url: camera.imageUrl };
          })
      )
      .flat();
  };

  const fetchStations = async () => {
    const response = await fetch(
      "https://tie.digitraffic.fi/api/v1/metadata/camera-stations?lastUpdated=false"
    );
    const json = await response.json();
    json.features.forEach(
      cameraStation =>
        (stations[cameraStation.properties.id] = {
          municipality: cameraStation.properties.municipality,
          province: cameraStation.properties.province
        })
    );
  };

  const pushNewImageToBuffer = shift => {
    shift && imageBuffer.shift();
    const randInt = Math.floor(Math.random() * Math.floor(cameras.length));
    imageBuffer.push(cameras[randInt]);
    imageStore.set(imageBuffer);
  };

  const replaceImage = src => {
    const index = imageBuffer.findIndex(src);
    const randInt = Math.floor(Math.random() * Math.floor(cameras.length));
    imageBuffer[index] = cameras[randInt];
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
    for (let i = 0; i < imageBufferSize; i++) {
      pushNewImageToBuffer(false);
    }
    loop();
  });

  const unsubscribe = imageStore.subscribe(input => {
    image = input;
    if (input[0]) {
      currentLocation = stations[input[0].id];
    }
  });

  onDestroy(() => unsubscribe());
</script>

<style>
  .slideShow {
    position: relative;
    display: flex;
    height: 100vh;
    width: 100vw;
  }
  .roadImage {
    display: none;
    flex-grow: 1;
    object-fit: cover;
  }
  .roadImage:first-of-type {
    display: flex;
  }
  .currentLocation {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 140px;
    flex-direction: column;
    align-items: center;
    z-index: 2;
  }
  h1 {
    width: 25%;
    min-width: 400px;
    text-align: center;
    font-size: 72px;
    font-weight: 400;
    margin: 0 0 14px 0;
    padding: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    color: #ffffff;
    text-shadow: 0px -5px 60px #000000;
  }
  span {
    color: rgba(255, 255, 255, 0.9);
    font-size: 32px;
    text-shadow: 0px -2px 40px #000000;
  }
</style>

<div class="slideShow">
  {#each image as image, index}
    <img src={image.url} alt={image.url} class="roadImage" />
  {/each}
</div>
<div class="currentLocation">
  <h1>{currentLocation.municipality}</h1>
  <span>{currentLocation.province}</span>
</div>
