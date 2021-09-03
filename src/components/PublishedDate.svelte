<script lang="ts">
  import moment from 'moment';

  export let published: Date;
  export let displayInline = false;
  export let showTime = false;
  const localeString = moment(published).format(`MMMM Do YYYY${showTime ? ', h:mm:ss a' : ''}`);
  const datetimeString = moment(published).format();
</script>

<time
  class={`${displayInline ? '' : 'block '}`}
  itemprop="datePublished"
  datetime={datetimeString}
  title={datetimeString}
>
  Published on {localeString}
</time>
