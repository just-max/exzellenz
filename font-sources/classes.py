#!/usr/bin/python3

from itertools import chain

right_full = {"A", "H", "M", "N", "O", "Q", "U", "W"}
right_upper_bar = {"P", "R"}
right_lower_bar = {"G", "S"}
right_upper_point = {"C", "E", "F", "G", "I", "J", "K", "S", "T", "V", "Y", "Z"}
right_lower_point = {"C", "E", "I", "K", "L", "R", "X", "Z"}
right_d_shape = {"B", "D"}
right_x_like = {"V", "X", "Y"}

left_full = {"A", "B", "C", "D", "E", "F", "G", "H", "K", "L", "M", "N", "O", "P", "Q", "R", "U", "W"}
left_upper_bar = {"S"}
left_lower_bar = set()
left_upper_point = {"I", "J", "T", "V", "Y", "Z"}
left_lower_point = {"I", "J", "X", "Y", "Z"}
left_x_like = right_x_like


class KernClass:
    def __init__(self, characters, name):
        self.characters = characters
        self.name = name


def std_kern_classes(*args: tuple, full: set = None, upper_point: set = None, lower_point: set = None,
                     upper_bar: set = None, lower_bar: set = None,
                     x_like: set = None) -> tuple:
    result = [KernClass(full, "Full"),
              KernClass(upper_point.intersection(lower_point).difference(x_like), "Upper and lower point"),
              KernClass(upper_bar.intersection(lower_point), "Upper bar and lower point"),
              KernClass(upper_bar.difference(lower_point), "Upper bar only"),
              KernClass(lower_point.difference(upper_bar).difference(upper_point).difference(x_like),
                        "Lower point only"),
              KernClass(lower_bar.intersection(upper_point), "Lower bar and upper point"),
              KernClass(lower_bar.difference(upper_point), "Lower bar only"),
              KernClass(upper_point.difference(lower_bar).difference(lower_point).difference(x_like),
                        "Upper point only"),
              KernClass(x_like, "X-like")]

    result.extend((KernClass(c, n) for n, c in args))

    return tuple(result)


right_classes = std_kern_classes(("D Shape", right_d_shape),
                                 full=right_full,
                                 upper_point=right_upper_point,
                                 lower_point=right_lower_point,
                                 upper_bar=right_upper_bar,
                                 lower_bar=right_lower_bar,
                                 x_like=right_x_like)

left_classes = std_kern_classes(full=left_full,
                                upper_point=left_upper_point,
                                lower_point=left_lower_point,
                                upper_bar=left_upper_bar,
                                lower_bar=left_lower_bar,
                                x_like=left_x_like)

sides = {"right": right_classes, "left": left_classes}

if __name__ == "__main__":

    with open("classes-output.txt", "w") as out:
        pass

    for side_name, kern_classes in sides.items():
        if not kern_classes:
            raise Exception("A kern class side contains no kern classes!")


        def names():
            return (c.name for c in kern_classes)


        longest_name_length = max(len(name) for name in names())

        f_string_c_name = "{c_name:>" + str(longest_name_length) + "}"
        collisions = []
        all_characters = set()

        print(f"{side_name.capitalize()} side collisions:")
        print(" " * longest_name_length, *names(), sep='|')

        for kern_class in kern_classes:
            print(f_string_c_name.format(c_name=kern_class.name), end="")


            def cell(content):
                return "".join(("|", ("{match:^" + str(len(other_kern_class.name)) + "}").format(match=content)))


            all_characters = all_characters.union(kern_class.characters)

            for other_kern_class in kern_classes:
                if kern_classes.index(kern_class) >= kern_classes.index(other_kern_class):
                    print(cell("-"), end="")
                else:
                    overlap = kern_class.characters.intersection(other_kern_class.characters)

                    if overlap:
                        collisions.append(overlap)
                        print(cell(len(collisions)), end="")
                    else:
                        print(cell(""), end="")
            print()

        if collisions:
            print(f"COLLISIONS ({len(collisions)}):")
            print(*(f"{i + 1}: {', '.join(sorted(v))}" for i, v in enumerate(collisions)), sep="\n")
        else:
            header = f"{side_name.capitalize()} side: {len(all_characters)} characters in " \
                     f"{len(list((k for k in kern_classes if k.characters)))} classes:"

            out_content = '\n'.join((f_string_c_name.format(c_name=c.name) +
                                     f": {' '.join(chain(*((c, c.lower()) for c in sorted(c.characters))))}"
                                     for i, c in enumerate(kern_classes) if c.characters))

            print(header)
            print(out_content)

            with open("classes-output.txt", "a") as out_file:
                out_file.write(f"{header}\n{out_content}\n")

