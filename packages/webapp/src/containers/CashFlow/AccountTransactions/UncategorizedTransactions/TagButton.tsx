import { Button } from "@blueprintjs/core"
import styles from './TagButton.module.scss';



export const TagButton = (props: any) => {
  return <Button  {...props} className={styles.root} />
}