import { app } from './app';

app.listen(parseInt(process.env.PORT!), () => {
  console.log(`server listening on port ${process.env.PORT}`);
});
