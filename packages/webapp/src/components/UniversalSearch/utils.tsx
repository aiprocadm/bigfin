
export const filterItemsByResourceType = (items: any, type: any) => {
    return items.filter((item: any) => item._type === type);
}