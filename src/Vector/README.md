# Vectors

To communicate a place in a plane to someone else, two things are needed:

- A origin
- Two non-parallel arrows (oriented line segments)

When both persons decide on an origin and two arrows, then they can communicate places in the plane to each other. Typically those arrows are unit length (they must first agree on what is a unit length), orthogonal to each other, and are placed at the origin. If Alice would like to communicate to Bob someplace x, then Alice would say: start at the origin, then move along the first arrow, three times, then move along the second arrow four times. Bob would immediately understand where x is.

Vector is in a first appreciation, **an algebra of arrows**, with their main purpose to describe positions and other arrows in space (in a way arrows and positions are the same). At first, it seems a reduction of the concept of vectors, but many problems can be described in this geometrical language, even though their nature seems different from geometry.

# Formal definition

Mathematicians pushed the definition of [vectors](https://en.wikipedia.org/wiki/Vector_space) to the most abstract realms, this library is only interested in the finite-dimensional case (where computers can do some work).

# Operations

## Add operation

One can add two arrows, just take the origin of one arrow to the end of another. From this, we can see that this operation is commutative and associative.

`add: (Vector, Vector) => Vector`

You also have an indentity element:
`zero: () => Vector`, `add(zero(), vector) = vector`

## Scalar multiplication

It is possible to follow an arrow n times, that operation is what is called scalar multiplication:
`scale: (Vector, Real) => Vector`

If `real < 0` it reverts orientation of the arrow. The inverse operation of the addition can be made using the next operation:
`add(vector, scale(vector,-1)) = zero`

## Subtract operation

`sub: (Vector, Vector) => Vector`, `sub(vector, vector) = zero`

## Abstract operations

### Map

`map: (Vector, Real => Real) => Vector`

### Binary Operation

`binaryOp: (Vector, Vector, (Real, Real) => Real) => Vector`

Add operation: `binaryOp(v1,v2, (a,b) => a + b) = add(v1, v2) `
Pointwise multiplication: `binaryOp(v1, v2, (a,b) => a * b)`

### FoldLeft

`fold: (Vector, (accumulator: Real, Real) => Real) => Real`
