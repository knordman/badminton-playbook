<script lang="ts">
import type { PropType } from "vue";

export default {
  props: {
    persons: {
      type: <PropType<string[]>>Array,
    },
  },
};
</script>

<template>
  <v-card>
    <v-card-title
      ><h6 class="text-uppercase font-weight-thin">Break</h6></v-card-title
    >
    <v-card-text>
      <h3 class="text-h5 text-truncate font-weight-thin pt-3 mx-2">
        {{ persons?.join(", ") }}
      </h3>
    </v-card-text>
  </v-card>
</template>

<style></style>
