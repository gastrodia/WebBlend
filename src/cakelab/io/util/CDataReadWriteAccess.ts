export default class CDataReadWriteAccess{
  	private pointerSize:number;

    constructor(pointerSize:number){
      this.pointerSize = pointerSize;
    }

    getPointerSize(){
      return this.pointerSize;
    }
}
