<script lang="ts">
  import moment from 'moment';

  export let date: Date;
  export let showTime = false;
  const friendlyString = moment(date).format(`MMMM Do YYYY${showTime ? ', h:mm:ss a' : ''}`);
  const datetimeString = moment(date).format();
  export let prefix = 'Published on ';
  export let itemProp = 'datePublished';
</script>

<time itemprop={itemProp} datetime={datetimeString} title={datetimeString}>
  {prefix}{friendlyString}
</time>
