import { defineComponent, h, useSlots, Ref } from 'vue';

type Slots = ReturnType<typeof useSlots>

export default (slots: Slots, ref: Ref<HTMLElement>) => {
  return defineComponent({
    setup() {
      let [defaultSlot] = slots.default();
      return () => h(defaultSlot, { ref: ref });
    },
  });
};