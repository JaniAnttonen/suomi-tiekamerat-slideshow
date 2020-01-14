<script>
  import Slideshow from "./Slideshow.svelte";

  var lunaReq = webOS.service.request("luna://com.palm.systemservice", {
    method: "clock/getTime",
    parameters: {},
    onSuccess: function(args) {
      console.log("UTC:", args.utc);
    },
    onFailure: function(args) {}
  });
</script>

<style>
  main {
    margin: 0;
    padding: 0;
  }
</style>

<main>
  <Slideshow />
</main>
