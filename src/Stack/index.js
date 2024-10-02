export default function Stack(head, tail) {
    
    const ans = {
        isEmpty: () => (head === null || head === undefined) && (tail === null || tail === undefined),
        push: (item) => {
            if(ans.isEmpty()) {
                _stack.push(item);
            }
            return Stack(item, ans);
        }
    }
    return ans;
}