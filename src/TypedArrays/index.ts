export class DynamicArray<T> {
    private data: T[];
    private _size: number;
    private _capacity: number;
  
    constructor(initialCapacity: number = 16) {
      if (initialCapacity <= 0) {
        throw new Error("Initial capacity must be a positive number");
      }
      this._capacity = initialCapacity;
      this.data = new Array<T>(this._capacity);
      this._size = 0;
    }
  
    /**
     * Gets the number of elements in the dynamic array.
     */
    get size(): number {
      return this._size;
    }
  
    /**
     * Gets the current capacity of the dynamic array.
     */
    get capacity(): number {
      return this._capacity;
    }
  
    /**
     * Adds an element to the end of the array.
     * @param element The element to add.
     */
    public push(element: T): void {
      if (this._size === this._capacity) {
        this.resize();
      }
      this.data[this._size] = element;
      this._size++;
    }
  
    /**
     * Removes and returns the last element of the array.
     * @returns The removed element, or undefined if the array is empty.
     */
    public pop(): T | undefined {
      if (this._size === 0) {
        return undefined;
      }
      const element = this.data[this._size - 1];
      this._size--;
      return element;
    }
  
    /**
     * Retrieves the element at the given index.
     * @param index The index of the element.
     * @returns The element at the specified index.
     * @throws If the index is out of bounds.
     */
    public get(index: number): T {
      if (index < 0 || index >= this._size) {
        throw new Error("Index out of bounds");
      }
      return this.data[index];
    }
  
    /**
     * Updates the element at the specified index.
     * @param index The index to update.
     * @param element The new value.
     * @throws If the index is out of bounds.
     */
    public set(index: number, element: T): void {
      if (index < 0 || index >= this._size) {
        throw new Error("Index out of bounds");
      }
      this.data[index] = element;
    }
  
    /**
     * Returns a shallow copy of the array's elements.
     */
    public toArray(): T[] {
      return this.data.slice(0, this._size);
    }
  
    /**
     * Doubles the capacity of the underlying array when needed.
     */
    private resize(): void {
      this._capacity *= 2;
      const newData = new Array<T>(this._capacity);
      for (let i = 0; i < this._size; i++) {
        newData[i] = this.data[i];
      }
      this.data = newData;
    }
  }
  