module.exports = InfiniteChecker

function InfiniteChecker(maxIterations){
  if (this instanceof InfiniteChecker){
    this.maxIterations = maxIterations
    this.count = 0
  } else {
    return new InfiniteChecker(maxIterations)
  }
}

InfiniteChecker.prototype.check = function(){
  this.count += 1
  if (this.count > this.maxIterations){
    throw new Error('Maximum iterations reached')
  }
}